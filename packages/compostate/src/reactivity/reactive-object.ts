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
import ReactiveAtom from './reactive-atom';
import ReactiveKeys from './reactive-keys';
import { registerTrackable } from './track-map';
import { ReactiveObject } from './types';

export default function createReactiveObject<T extends ReactiveObject>(
  source: T,
): T {
  const collection = new ReactiveKeys<string | symbol | number>();
  const atom = new ReactiveAtom();

  const proxy = new Proxy(source, {
    get(target, key, receiver) {
      collection.track(key);
      return Reflect.get(target, key, receiver);
    },
    has(target, key) {
      collection.track(key);
      return Reflect.has(target, key);
    },
    deleteProperty(target, key) {
      const deleted = Reflect.deleteProperty(target, key);
      if (deleted) {
        collection.notify(key);
        atom.notify();
      }
      return deleted;
    },
    set(target, key, value, receiver) {
      const current = Reflect.get(target, key, receiver);

      const result = Reflect.set(target, key, value, receiver);

      if (result && !Object.is(current, value)) {
        collection.notify(key);
        atom.notify();
      }

      return result;
    },
  });

  registerTrackable(atom, proxy);

  return proxy;
}
