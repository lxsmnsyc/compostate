/**
 * @license
 * MIT License
 *
 * Copyright (c) 2021 Alexis Munsayac
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 *
 * @author Alexis Munsayac <alexis.munsayac@gmail.com>
 * @copyright Alexis Munsayac 2021
 */
/* eslint-disable @typescript-eslint/ban-types */
import isPlainObject from '../utils/is-plain-object';
import ReactiveMap from './reactive-map';
import createReactiveObject from './reactive-object';
import ReactiveSet from './reactive-set';
import ReactiveWeakMap from './reactive-weak-map';
import ReactiveWeakSet from './reactive-weak-set';
import { ReactiveBaseObject } from './types';

const proxies = new WeakMap();

export function isReactive<T extends ReactiveBaseObject>(source: T): boolean {
  return proxies.has(source);
}

function getReactive(source: unknown): any {
  if (source instanceof Map) {
    return new ReactiveMap(source);
  }
  if (source instanceof Set) {
    return new ReactiveSet(source);
  }
  if (source instanceof WeakMap) {
    return new ReactiveWeakMap(source);
  }
  if (source instanceof WeakSet) {
    return new ReactiveWeakSet(source);
  }
  if (Array.isArray(source) || isPlainObject(source)) {
    return createReactiveObject(source);
  }
  throw new Error('invalid reactive source');
}

function reactive<T extends any[]>(source: T): T;
function reactive<T extends Record<string | symbol, any>>(source: T): T;
function reactive<V>(source: Set<V>): ReactiveSet<V>;
function reactive<K, V>(source: Map<K, V>): ReactiveMap<K, V>;
function reactive<V extends object>(source: WeakSet<V>): ReactiveWeakSet<V>;
function reactive<K extends object, V>(source: WeakMap<K, V>): ReactiveWeakMap<K, V>;
function reactive(source: any): any {
  const currentProxy = proxies.get(source);
  if (currentProxy) {
    return currentProxy;
  }

  const newProxy = getReactive(source);
  proxies.set(source, newProxy);
  return newProxy;
}

export default reactive;
