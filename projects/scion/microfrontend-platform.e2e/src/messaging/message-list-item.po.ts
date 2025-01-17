/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms from the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {SwitchToIframeFn} from '../browser-outlet/browser-outlet.po';
import {ElementFinder} from 'protractor';
import {Capability, Qualifier} from '@scion/microfrontend-platform';
import {SciListItemPO} from '../../deps/scion/toolkit.internal/list/list-item.po';
import {SciPropertyPO} from '../../deps/scion/toolkit.internal/property/property.po';

export class MessageListItemPO {

  private _contentFinder: ElementFinder;

  constructor(private _listItemPO: SciListItemPO, private _switchToIframeFn: SwitchToIframeFn) {
    this._contentFinder = this._listItemPO.contentFinder.$('app-message-list-item');
  }

  public async getTopic(): Promise<string> {
    await this._switchToIframeFn();
    return this._contentFinder.$('span.e2e-topic').getText();
  }

  public async getParams(): Promise<Map<string, string>> {
    await this._switchToIframeFn();
    if (!await this._contentFinder.$('sci-property.e2e-params').isPresent()) {
      return new Map<string, string>();
    }
    return new SciPropertyPO(this._contentFinder.$('sci-property.e2e-params')).readAsMap();
  }

  public async getHeaders(): Promise<Map<string, string>> {
    await this._switchToIframeFn();
    return new SciPropertyPO(this._contentFinder.$('sci-property.e2e-headers')).readAsMap();
  }

  public async getBody(): Promise<string> {
    await this._switchToIframeFn();
    return this._contentFinder.$('span.e2e-body').getText();
  }

  public async getReplyTo(): Promise<string | undefined> {
    await this._switchToIframeFn();
    const replyToFinder = this._contentFinder.$('span.e2e-reply-to');
    const isPresent = await replyToFinder.isPresent();
    return isPresent ? replyToFinder.getText() : undefined;
  }

  public async getIntentType(): Promise<string> {
    await this._switchToIframeFn();
    return this._contentFinder.$('span.e2e-intent-type').getText();
  }

  public async getIntentQualifier(): Promise<Qualifier> {
    await this._switchToIframeFn();
    return new SciPropertyPO(this._contentFinder.$('sci-property.e2e-intent-qualifier')).readAsDictionary();
  }

  public async getIntentParams(): Promise<Map<string, any>> {
    await this._switchToIframeFn();
    return new SciPropertyPO(this._contentFinder.$('sci-property.e2e-intent-params')).readAsMap();
  }

  public async getCapability(): Promise<Capability> {
    await this._switchToIframeFn();
    return JSON.parse(await this._listItemPO.contentFinder.$('[data-e2e-capability]').getAttribute('data-e2e-capability'));
  }

  public async clickReply(): Promise<void> {
    await this._switchToIframeFn();
    await this._listItemPO.clickAction('e2e-reply');
  }
}
