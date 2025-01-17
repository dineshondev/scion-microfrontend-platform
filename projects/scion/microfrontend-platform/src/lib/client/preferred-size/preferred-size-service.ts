/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {fromDimension$} from '@scion/toolkit/observable';
import {takeUntil} from 'rxjs/operators';
import {filter, merge, Subject, withLatestFrom} from 'rxjs';
import {ContextService} from '../context/context-service';
import {OUTLET_CONTEXT, OutletContext, RouterOutlets} from '../router-outlet/router-outlet.element';
import {MessageClient} from '../messaging/message-client';
import {PreferredSize} from './preferred-size';
import {Beans, PreDestroy} from '@scion/toolkit/bean-manager';
import {runSafe} from '../../safe-runner';

/**
 * Allows web content displayed in a {@link SciRouterOutletElement `<sci-router-outlet>`} to define its preferred size.
 *
 * The preferred size of an element is the minimum size that will allow it to display normally.
 * Setting a preferred size is useful if the outlet is displayed in a layout that aligns its items based on the items's content size.
 *
 * When setting a preferred size, the outlet containing this microfrontend will adapt its size to the reported preferred size.
 *
 * @category Preferred Size
 */
export class PreferredSizeService implements PreDestroy {

  private _destroy$ = new Subject<void>();
  private _fromDimensionElementChange$ = new Subject<void>();
  private _publishPreferredSize: PreferredSizePublisher;

  constructor() {
    this._publishPreferredSize = this.createPreferredSizePublisher();
  }

  /**
   * Sets the preferred size of this web content.
   * The size is reported to the router outlet embedding this web content and is used as the outlet's size.
   */
  public setPreferredSize(preferredSize: PreferredSize): void {
    this._publishPreferredSize(preferredSize);
  }

  /**
   * Determines the preferred size from the given element's dimension and reports it to the router outlet embedding this web content.
   * As the value for the preferred size, the `offset-width` and `offset-height` of the element are used, which is the total amount of space
   * the element occupies, including the width of the visible content, scrollbars (if any), padding, and border.
   *
   * When the size of the element changes, the changed size is reported to the outlet, which then adaps its size accordingly.
   * To stop the notifying of the preferred size to the outlet, pass `undefined` as the value, which also unsets the preferred size.
   *
   * If the element is removed from the DOM, the preferred size is reset and reporting suspended until it is attached again.
   * If a new element is set as dimension observer, then the previous one is unsubscribed.
   *
   * *Prerequisites*
   * - The element to be observed must behave as block-level box and not as inline-level box. So, if you want to observe an inline element,
   *   set its display type to either `block` or `inline-block`.
   * - If the element to be observed should not fill the remaining space and may change in size, we recommend taking it out of the document
   *   element flow, i.e., position it absolutely without defining a width and height. Otherwise, once the element has reported a preferred
   *   size, it could not shrink below that size.
   *
   * @param element - The element of which the preferred size is to be observed and used as the outlet's size.
   */
  public fromDimension(element: HTMLElement | undefined): void {
    this._fromDimensionElementChange$.next();

    if (!element) {
      this.resetPreferredSize();
      return;
    }

    fromDimension$(element)
      .pipe(takeUntil(merge(this._fromDimensionElementChange$, this._destroy$)))
      .subscribe(dimension => {
        // If the element is removed from the DOM, the preferred size is reset and reporting suspended until it is attached again.
        if (!document.body.contains(dimension.element)) {
          this.resetPreferredSize();
        }
        else {
          this.setPreferredSize({
            minWidth: `${dimension.offsetWidth}px`,
            width: `${dimension.offsetWidth}px`,
            maxWidth: `${dimension.offsetWidth}px`,
            minHeight: `${dimension.offsetHeight}px`,
            height: `${dimension.offsetHeight}px`,
            maxHeight: `${dimension.offsetHeight}px`,
          });
        }
      });
  }

  /**
   * Resets the preferred size. Has no effect if no preferred size is set.
   */
  public resetPreferredSize(): void {
    this._publishPreferredSize(null);
  }

  /**
   * Constructs a function to publish the preferred size to the outlet.
   */
  private createPreferredSizePublisher(): PreferredSizePublisher {
    const publish$ = new Subject<PreferredSize | null>();
    publish$
      .pipe(
        withLatestFrom(Beans.get(ContextService).observe$<OutletContext>(OUTLET_CONTEXT).pipe(filter(Boolean))),
        takeUntil(this._destroy$),
      )
      .subscribe(([preferredSize, outletContext]) => runSafe(() => {
        const topic = RouterOutlets.preferredSizeTopic(outletContext.uid);
        Beans.get(MessageClient).publish(topic, preferredSize);
      }));

    return preferredSize => publish$.next(preferredSize);
  }

  /** @ignore */
  public preDestroy(): void {
    this._destroy$.next();
  }
}

interface PreferredSizePublisher {
  (preferredSize: PreferredSize | null): void;
}
