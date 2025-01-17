/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {fromEvent, merge, NEVER, Observable, OperatorFunction, pipe, ReplaySubject, Subject, throwError} from 'rxjs';
import {filter, finalize, map, mergeMap, take, takeUntil} from 'rxjs/operators';
import {UUID} from '@scion/toolkit/uuid';
import {Dictionary} from '@scion/toolkit/util';

/**
 * Fixture for creating an iframe and loading a script into the iframe.
 *
 * The script must be contained in a standalone typescript file with a filename ending with ".script.ts", e.g. "microfrontend.script.ts".
 * In the script, you can reference project-specific types (types which are part of this project) and types which are available through
 * dependent NPM packages (e.g. `@scion/toolkit/bean-manager/Beans`).
 *
 * Note that the script runs in a separate scripting/browsing context having the same origin as the current document.
 *
 * ---
 * ### Usage:
 *
 * #### Spec:
 *
 * ```ts
 * // Start host-app
 * await MicrofrontendPlatform.startHost({
 *   applications: [
 *     {
 *       symbolicName: 'client',
 *       manifestUrl: new ManifestFixture({name: 'Client App'}).serve(),
 *     },
 *   ],
 * });
 *
 * // Mount micro application
 * const fixture = new MicrofrontendFixture();
 * await fixture.insertIframe().loadScript('./lib/microfrontend.script.ts', 'connectToHost', {symbolicName: 'client'});
 *```
 *
 * #### Script: "./lib/microfrontend.script.ts"
 * ```ts
 * export async function connectToHost(params: Dictionary): Promise<void> {
 *   await MicrofrontendPlatform.connectToHost(params['symbolicName']);
 * }
 * ```
 */
export class MicrofrontendFixture {

  private _unmount$ = new Subject<void>();
  private _disposables = new Set<Disposable>();

  /**
   * Iframe created by this fixture.
   */
  public iframe: HTMLIFrameElement | null = null;

  /**
   * Messages sent by the script.
   *
   * Each time a script is loaded into the iframe, a new Observable is created. Upon subscription,
   * any old messages that the script has already emitted will be "replayed".
   */
  public message$: Observable<any> = NEVER;

  /**
   * Creates an iframe and adds it to the DOM. Throws an error if already mounted.
   */
  public insertIframe(): this {
    if (this.iframe) {
      throw Error('[MicrofrontendFixtureError] iframe already mounted.');
    }
    this.iframe = document.body.appendChild(document.createElement('iframe'));
    return this;
  }

  /**
   * Loads the specified script into the iframe.
   *
   * Transpiles the function in the specified TypeScript file to JavaScript, loads it into the iframe and invokes it,
   * passing the function specified arguments and an Observer so that the script can send messages to the fixture.
   *
   * The script must be contained in a standalone typescript file with a filename ending with ".script.ts", e.g. "microfrontend.script.ts".
   * In the script, you can reference project-specific types (types which are part of this project) and types which are available through
   * dependent NPM packages (e.g. `@scion/toolkit/bean-manager/Beans`).
   *
   * Note that the script runs in a separate scripting/browsing context having the same origin as the current document.
   *
   * The script is invoked with the following arguments:
   *  - params: {@link Dictionary}
   *    Arguments as passed to the fixture.
   *  - observer: {@link Observer}
   *    Observer to send messages from the script to the fixture.
   *
   * @param scriptPath - Specifies the location of the script (relative to the "src" folder of the project, e.g., "./lib/microfrontend.script.ts". The file name must end with ".script.ts".
   * @param functionName - Specifies the function in the specified script which to transpile to JavaScript. That function will be loaded into the iframe and invoked.
   * @param args - Specifies optional arguments to be passed to the function. Arguments are passed as first argument in the form of a dictionary.
   * @return Promise that resolves when completed loading the script, or that rejects when script execution fails.
   */
  public loadScript(scriptPath: string, functionName: string, args?: Dictionary): Promise<void> {
    const scriptHandle = this.serveScript(scriptPath, functionName, args);
    this.setUrl(scriptHandle.url);
    return scriptHandle.whenLoaded;
  }

  /**
   * Serves the specified script, but unlike {@link loadScript}, does not load it into the iframe.
   *
   * Returns a handle to obtain the script's URL and notifier Promise that resolves when loaded the script.
   * Using the returned URL, the script can be loaded via {@link MicrofrontendFixture.setUrl} or from within a script via `location.href`.
   *
   * See {@link loadScript} for more information about the transpilation of the script.
   *
   * @param scriptPath - Specifies the location of the script (relative to the "src" folder of the project, e.g., "./lib/microfrontend.script.ts". The file name must end with ".script.ts".
   * @param functionName - Specifies the function in the specified script which to transpile to JavaScript. That function will be loaded into the iframe and invoked.
   * @param args - Specifies optional arguments to be passed to the function. Arguments are passed as first argument in the form of a dictionary.
   * @return Handle to obtain the script's URL and notifier Promise that resolves when loaded the script.
   */
  public serveScript(scriptPath: string, functionName: string, args?: Dictionary): {url: string; whenLoaded: Promise<void>} {
    if (!scriptPath.endsWith('.script.ts')) {
      throw Error(`[MicrofrontendFixtureError] Expected script file name to end with '.script.ts', but was ${scriptPath}.`);
    }

    const uuid = UUID.randomUUID();
    const channels: MessageChannels = {
      next: `onnext@${uuid}`,
      error: `onerror@${uuid}`,
      complete: `oncomplete@${uuid}`,
      load: `onload@${uuid}`,
    };
    const html = this.createHtmlToInvokeScript(scriptPath, functionName, args || {}, channels);
    const url = URL.createObjectURL(new Blob([html], {type: 'text/html'}));
    this._disposables.add(() => URL.revokeObjectURL(url));

    // Emit messages sent by the script to the fixture.
    const message$ = new ReplaySubject(Infinity);
    const next$ = fromEvent<MessageEvent>(window, 'message').pipe(filterByChannel(channels.next));
    const error$ = fromEvent<MessageEvent>(window, 'message').pipe(filterByChannel(channels.error), mergeMap(error => throwError(() => Error(error))));
    const complete$ = fromEvent<MessageEvent>(window, 'message').pipe(filterByChannel(channels.complete));
    const load$ = fromEvent<MessageEvent>(window, 'message').pipe(filterByChannel(channels.load));
    merge(next$, error$)
      .pipe(takeUntil(merge(complete$, this._unmount$)))
      .subscribe(message$);

    const whenLoaded = new Promise<void>((resolve, reject) => {
      merge(load$, error$)
        .pipe(
          take(1),
          finalize(() => this.message$ = message$),
        )
        .subscribe({
          error: reject,
          complete: resolve,
        });
    });

    return {url, whenLoaded};
  }

  /**
   * Instructs the iframe to load content from given URL.
   */
  public setUrl(url: string): void {
    if (!this.iframe) {
      throw Error('[MicrofrontendFixtureError] Iframe not found.');
    }
    this.iframe.setAttribute('src', url);
    this.message$ = NEVER;
  }

  /**
   * Removes the iframe from the DOM, if any.
   */
  public removeIframe(): this {
    this._disposables.forEach(disposable => disposable());
    this._disposables.clear();

    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
      this.message$ instanceof Subject && this.message$.complete();
      this.message$ = NEVER;
      this._unmount$.next();
    }
    return this;
  }

  private createHtmlToInvokeScript(scriptPath: string, scriptMethod: string, args: Dictionary, channels: MessageChannels): string {
    const jsonArgs = JSON.stringify(args);
    return `
        <html>
          <head>
            <!-- Set global flag to instruct "test.ts" to create a webpack context with only "*.script.ts" files (plus referenced files).  -->
            <script>window['${WEBPACK_SCRIPT_CONTEXT_ACTIVE}'] = true;</script>
            <!-- Load webpack runtime into the iframe. -->
            <script src="${new URL('_karma_webpack_/runtime.js', window.parent.origin).href}"></script>
            <!-- Load transpiled files of project dependencies into the iframe (e.g., SCION Toolkit).  -->
            <script src="${new URL('_karma_webpack_/vendor.js', window.parent.origin).href}"></script>
            <!-- Load transpiled files of the project into the iframe. -->
            <script src="${new URL('_karma_webpack_/main.js', window.parent.origin).href}"></script>
            <!-- Execute the script, dispatching messages sent by the script to the fixture. -->
            <script type="module">
                (async () => {
                  // Create Observer for the script to send messages to the fixture. 
                  const observer = {
                    next: (value) => window.parent.postMessage({ channel: '${channels.next}', value: value}, window.origin),
                    error: (error) => window.parent.postMessage({ channel: '${channels.error}', value: error}, window.origin),
                    complete: () => window.parent.postMessage({ channel: '${channels.complete}'}, window.origin),
                  };
                  try {
                    // Execute the script.
                    await window['${WEBPACK_SCRIPT_CONTEXT}']('${scriptPath}')['${scriptMethod}'](JSON.parse('${jsonArgs}'), observer);
                    // Signal script execution completed.
                    window.parent.postMessage({ channel: '${channels.load}'}, window.origin);
                  } 
                  catch (error) {
                    observer.error(error);  
                  }
                })();
            </script>
          </head>
          <body>
            <h1>Microfrontend</h1>
            ${scriptPath}#${scriptMethod}
          </body>
        </html>`;
  }
}

function filterByChannel(channel: string): OperatorFunction<MessageEvent, any> {
  return pipe(
    filter(message => message.data.channel === channel),
    map(message => message.data.value),
  );
}

interface MessageChannels {
  next: string;
  error: string;
  complete: string;
  load: string;
}

/**
 * Global flag to instruct `projects/scion/microfrontend-platform/src/test.ts` to create a Webpack context of only "*.script.ts" files (plus referenced files).
 */
export const WEBPACK_SCRIPT_CONTEXT_ACTIVE = '__webpackScriptContextActive__';

/**
 * Reference to the webpack context if {@link WEBPACK_SCRIPT_CONTEXT_ACTIVE} is active.
 */
export const WEBPACK_SCRIPT_CONTEXT = '__WebpackScriptContext__';

type Disposable = () => void;
