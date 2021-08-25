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
import {
  createReactiveAtom,
  destroyReactiveAtom,
  notifyReactiveAtom,
  ReactiveAtom,
  trackReactiveAtom,
} from '../core';

export type ReactiveKeys<K> = Map<K, ReactiveAtom>;

export function createReactiveKeys<K>(): ReactiveKeys<K> {
  return new Map();
}

export function destroyReactiveKeys<K>(keys: ReactiveKeys<K>): void {
  for (const value of keys.values()) {
    destroyReactiveAtom(value);
  }
}

function getAtom<K>(atoms: ReactiveKeys<K>, key: K): ReactiveAtom {
  const current = atoms.get(key);
  if (current) {
    return current;
  }
  const atom = createReactiveAtom();
  atoms.set(key, atom);
  return atom;
}

export function notifyReactiveKeys<K>(
  keys: ReactiveKeys<K>,
  key: K,
  destroy?: boolean,
): void {
  const atom = getAtom(keys, key);
  notifyReactiveAtom(atom);
  if (destroy) {
    destroyReactiveAtom(atom);
  }
}

export function trackReactiveKeys<K>(
  keys: ReactiveKeys<K>,
  key: K,
): void {
  trackReactiveAtom(getAtom(keys, key));
}

export function notifyAllReactiveKeys<K>(
  keys: ReactiveKeys<K>,
  destroy?: boolean,
): void {
  if (keys.size) {
    for (const value of keys.values()) {
      notifyReactiveAtom(value);
      if (destroy) {
        destroyReactiveAtom(value);
      }
    }
    if (destroy) {
      keys.clear();
    }
  }
}
