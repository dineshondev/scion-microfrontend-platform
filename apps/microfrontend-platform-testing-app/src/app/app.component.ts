/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {Component, HostListener, OnDestroy} from '@angular/core';
import {ContextService, MicrofrontendPlatform, OUTLET_CONTEXT, OutletContext} from '@scion/microfrontend-platform';
import {Beans} from '@scion/toolkit/bean-manager';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnDestroy {

  private _outletContext: Promise<OutletContext>;

  constructor() {
    this._outletContext = Beans.get(ContextService).lookup<OutletContext>(OUTLET_CONTEXT);
  }

  @HostListener('document:keydown.control.alt.shift.s', ['$event'])
  public async onE2eTestKeyboardEvent(event: KeyboardEvent): Promise<void> {
    // only log "real", aka trusted events and ignore synthetic events, e.g. keyboard events propagated across iframe boundaries.
    if (event.isTrusted) {
      const outletContextName = (await this._outletContext)?.name ?? 'n/a';
      console.debug(`[AppComponent::document:onkeydown] [TRUSTED] [outletContext=${outletContextName}, key='${event.key}', control=${event.ctrlKey}, shift=${event.shiftKey}, alt=${event.altKey}, meta=${event.metaKey}, defaultPrevented=${event.defaultPrevented}]`);
    }
  }

  @HostListener('document:keydown', ['$event'])
  @HostListener('document:keyup', ['$event'])
  public async onPropagatedKeyboardEvent(event: KeyboardEvent): Promise<void> {
    // only log propagated keyboard events, i.e., keyboard events propagated across iframe boundaries.
    if (!event.isTrusted && (event.target as Element).tagName === 'SCI-ROUTER-OUTLET') {
      const outletContextName = (await this._outletContext)?.name ?? 'n/a';
      console.debug(`[AppComponent::document:on${event.type}] [SYNTHETIC] [outletContext=${outletContextName}, key='${event.key}', control=${event.ctrlKey}, shift=${event.shiftKey}, alt=${event.altKey}, meta=${event.metaKey}]`);
    }
  }

  public ngOnDestroy(): void {
    MicrofrontendPlatform.destroy().then(); // Platform is started in {@link PlatformInitializer}
  }
}
