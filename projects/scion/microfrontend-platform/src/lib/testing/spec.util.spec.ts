/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {Arrays} from '@scion/toolkit/util';
import {ObserveCaptor} from '@scion/toolkit/testing';
import {ConsoleLogger, Logger} from '../logger';
import {Beans} from '@scion/toolkit/bean-manager';
import {MessageClient} from '../client/messaging/message-client';
import {first} from 'rxjs/operators';
import {stringifyError} from '../error.util';
import CallInfo = jasmine.CallInfo;

/**
 * Expects the given Promise to either resolve or reject.
 *
 * Prefer this expectation over Jasmine `expectAsync` as we experienced unexpected behavior. The `expectAsync` expectation was added to Jasmine in version 3.5.
 *
 * - Jasmine `toBeRejectedWithError` matcher does not support to test against a regular expression if the error is not of type 'Error'
 * - Jasmine `toBeResolved` sometimes does not wait for the Promise to resolve. We did not investigate this further.
 *
 * @see https://jasmine.github.io/api/3.5/async-matchers.html
 */
export function expectPromise(actual: Promise<any>): PromiseMatcher {
  return {
    toResolve: async (expected?: any): Promise<void> => {
      try {
        const value = await actual;
        if (expected !== undefined) {
          expect(value).toEqual(expected);
        }
        else {
          expect(true).toBeTrue();
        }
      }
      catch (reason) {
        fail(`Promise expected to be resolved but was rejected: ${reason}`);
      }
    },
    toReject: async (expected?: RegExp): Promise<void> => {
      try {
        const value = await actual;
        fail(`Promise expected to be rejected but was resolved: ${value}`);
      }
      catch (reason) {
        if (expected && !stringifyError(reason).match(expected)) {
          fail(`Expected promise to be rejected with a reason matching '${expected.source}', but was '${(stringifyError(reason))}'.`);
        }
        else {
          expect(true).toBeTrue();
        }
      }
    },
  };
}

export interface PromiseMatcher {
  /**
   * Expects the Promise to resolve. If passing an expected value, also performs an equality test.
   * You can wrap your expectation inside the `objectContaining` or `mapContaining` matcher to test for partial equality.
   */
  toResolve(expected?: any): Promise<void>;

  /**
   * Expects the Promise to reject. If passing a regular expression, also tests the error to match the regex.
   */
  toReject(expected?: RegExp): Promise<void>;
}

/**
 * Returns a Promise that resolves after the given millis elapses.
 */
export function waitFor(millis: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, millis));
}

/**
 * Returns a Promise that resolves when the condition returns `true` or that rejects when the timeout expires.
 */
export function waitForCondition(condition: () => boolean | Promise<boolean>, timeout: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const expiryDate = Date.now() + timeout;
    const periodicConditionCheckerFn = async (): Promise<void> => {
      if (await condition()) {
        resolve();
      }
      else if (Date.now() > expiryDate) {
        reject(`[SpecTimeoutError] Timeout elapsed. Condition not fulfilled within ${timeout}ms.`);
      }
      else {
        setTimeout(periodicConditionCheckerFn, 10);
      }
    };
    periodicConditionCheckerFn().then();
  });
}

/**
 * Expects the {@link ObserveCaptor} to capture given emissions. This expectation waits a maximum of 5 seconds until the expected element count
 * is captured.
 */
export function expectEmissions<T = any, R = T>(captor: ObserveCaptor<T, R>): {toEqual: (expected: R | R[]) => Promise<void>} {
  return {
    toEqual: async (expected: R | R[]): Promise<void> => {
      const expectedValues = Arrays.coerce(expected);
      await captor.waitUntilEmitCount(expectedValues.length, 5000);
      return expect(captor.getValues()).toEqual(expectedValues);
    },
  };
}

export function installLoggerSpies(): void {
  const logger = new ConsoleLogger();
  spyOn(logger, 'info').and.callThrough();
  spyOn(logger, 'warn').and.callThrough();
  spyOn(logger, 'error').and.callThrough();
  Beans.register(Logger, {useValue: logger});
}

export function readConsoleLog(severity: 'info' | 'warn' | 'error', options?: {filter?: RegExp; projectFn?: (call: CallInfo<any>) => string}): string[] {
  return getLoggerSpy(severity).calls
    .all()
    .map(call => options?.projectFn ? options.projectFn(call) : call.args[0])
    .filter(msg => options?.filter ? msg.match(options.filter) !== null : true);
}

export function getLoggerSpy(severity: 'info' | 'warn' | 'error'): jasmine.Spy {
  switch (severity) {
    case 'info':
      return Beans.get(Logger).info as jasmine.Spy;
    case 'warn':
      return Beans.get(Logger).warn as jasmine.Spy;
    case 'error':
      return Beans.get(Logger).error as jasmine.Spy;
    default:
      throw Error(`[SpecError] Unsupported severity for logger spy. Expected one of ['info', 'warn', 'error'], but was '${severity}'.`);
  }
}

export function resetLoggerSpy(severity: 'info' | 'warn' | 'error'): void {
  getLoggerSpy(severity).calls.reset();
}

/**
 * Waits until the given number of subscribers are subscribed to the given topic, or throws an error otherwise.
 */
export async function waitUntilSubscriberCount(topic: string, expectedCount: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    Beans.get(MessageClient).subscriberCount$(topic)
      .pipe(first(count => count === expectedCount))
      .subscribe({
        error: reject,
        complete: resolve,
      });
  });
}
