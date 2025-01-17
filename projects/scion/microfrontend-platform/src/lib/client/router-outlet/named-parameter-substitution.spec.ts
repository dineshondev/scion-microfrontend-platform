/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {MicrofrontendPlatform} from '../../microfrontend-platform';
import {RouterOutlets} from './router-outlet.element';
import {OutletRouter} from './outlet-router';
import {NavigationOptions} from './metadata';
import {expectPromise} from '../../testing/spec.util.spec';
import {UUID} from '@scion/toolkit/uuid';
import {mapToBody} from '../../messaging.model';
import {Beans} from '@scion/toolkit/bean-manager';
import {MessageClient} from '../messaging/message-client';
import {firstValueFrom} from 'rxjs';

describe('OutletRouter', () => {

  describe('Named parameter substitution', () => {

    beforeAll(async () => await MicrofrontendPlatform.startHost({applications: []}));
    afterAll(async () => await MicrofrontendPlatform.destroy());

    describe('absolute URL (hash-based routing)', () => testSubstitution('http://localhost:4200/#/', {expectedBasePath: 'http://localhost:4200/#/'}));
    describe('absolute URL (push-state routing)', () => testSubstitution('http://localhost:4200/', {expectedBasePath: 'http://localhost:4200/'}));

    describe('relative URL (hash-based routing)', () => testSubstitution('/', {expectedBasePath: 'http://localhost:4200/#/', relativeTo: 'http://localhost:4200/#/a/b/c'}));
    describe('relative URL (push-based routing)', () => testSubstitution('/', {expectedBasePath: 'http://localhost:4200/', relativeTo: 'http://localhost:4200/a/b/c'}));

    function testSubstitution(basePath: string, options: {relativeTo?: string; expectedBasePath: string}): void {
      it('should substitute a named path param', async () => {
        const url = navigate(`${basePath}order/:id`, {
          params: new Map().set('id', 123),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123`);
      });

      it('should substitute multiple named path params (1)', async () => {
        const url = navigate(`${basePath}order/:orderId/product/:productId`, {
          params: new Map().set('orderId', 123).set('productId', 456),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123/product/456`);
      });

      it('should substitute multiple named path params (2)', async () => {
        const url = navigate(`${basePath}order/:orderId/product/:productId/vendor`, {
          params: new Map().set('orderId', 123).set('productId', 456),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123/product/456/vendor`);
      });

      it('should substitute a named query param', async () => {
        const url = navigate(`${basePath}order/:orderId?product=:productId`, {
          params: new Map().set('orderId', 123).set('productId', 456),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123?product=456`);
      });

      it('should substitute multiple named query params', async () => {
        const url = navigate(`${basePath}order/:orderId?product=:productId&stock=:stock`, {
          params: new Map().set('orderId', 123).set('productId', 456).set('stock', 5),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123?product=456&stock=5`);
      });

      it('should substitute multiple named query params (2)', async () => {
        const url = navigate(`${basePath}order/:orderId?product=:productId&stock=:stock&vendor=true`, {
          params: new Map().set('orderId', 123).set('productId', 456).set('stock', 5),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123?product=456&stock=5&vendor=true`);
      });

      it('should substitute a named matrix param', async () => {
        const url = navigate(`${basePath}order/:orderId;product=:productId`, {
          params: new Map().set('orderId', 123).set('productId', 456),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123;product=456`);
      });

      it('should substitute multiple named matrix params', async () => {
        const url = navigate(`${basePath}order/:orderId;product=:productId;stock=:stock`, {
          params: new Map().set('orderId', 123).set('productId', 456).set('stock', 5),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123;product=456;stock=5`);
      });

      it('should substitute multiple named matrix params (2)', async () => {
        const url = navigate(`${basePath}order/:orderId;product=:productId;stock=:stock;vendor=true`, {
          params: new Map().set('orderId', 123).set('productId', 456).set('stock', 5),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123;product=456;stock=5;vendor=true`);
      });

      it('should substitute a named fragment param (1)', async () => {
        const url = navigate(`${basePath}order/:orderId#:fragment`, {
          params: new Map().set('orderId', 123).set('productId', 456).set('fragment', 'abc'),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123#abc`);
      });

      it('should substitute a named fragment param (2)', async () => {
        const url = navigate(`${basePath}order/:orderId#fragment:fragment`, {
          params: new Map().set('orderId', 123).set('productId', 456).set('fragment', 'abc'),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}order/123#fragmentabc`);
      });

      it('should substitute named path params, named query params, named matrix params and named fragment params', async () => {
        const url = navigate(`${basePath}a/:param1/b/:param2;mp1=:param3;mp2=:param4;mp3=:param1;m4=static?qp1=:param5&qp2=:param6&qp3=static#frag_:param7`, {
          params: new Map()
            .set('param1', 'PARAM1')
            .set('param2', 'PARAM2')
            .set('param3', 'PARAM3')
            .set('param4', 'PARAM4')
            .set('param5', 'PARAM5')
            .set('param6', 'PARAM6')
            .set('param7', 'PARAM7'),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}a/PARAM1/b/PARAM2;mp1=PARAM3;mp2=PARAM4;mp3=PARAM1;m4=static?qp1=PARAM5&qp2=PARAM6&qp3=static#frag_PARAM7`);
      });

      it('should substitute falsy params', async () => {
        const url = navigate(`${basePath}a?orderId=:orderId&flag=:flag&object=:object&undefined=:undefined`, {
          params: new Map()
            .set('orderId', 0)
            .set('flag', false)
            .set('object', null)
            .set('undefined', undefined),
          relativeTo: options.relativeTo,
        });
        await expectPromise(url).toResolve(`${options.expectedBasePath}a?orderId=0&flag=false&object=null&undefined=undefined`);
      });
    }

    async function navigate(url: string, navigationOptions: NavigationOptions): Promise<string> {
      const outlet = UUID.randomUUID();
      // Navigate to the given URL
      await Beans.get(OutletRouter).navigate(url, {...navigationOptions, outlet});
      // Lookup the navigated URL
      return firstValueFrom(Beans.get(MessageClient).observe$<string>(RouterOutlets.urlTopic(outlet)).pipe(mapToBody<string>()));
    }
  });
});
