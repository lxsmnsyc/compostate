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
import { createReactiveAtom, notifyReactiveAtom } from './nodes/reactive-atom';
import ReactiveKeys from './nodes/reactive-keys';
import { registerTrackable } from './nodes/track-map';

export default class ReactiveSet<V> implements Set<V> {
  private collection?: ReactiveKeys<V>;

  private atom = createReactiveAtom();

  private source: Set<V>;

  constructor(source: Set<V>) {
    this.source = source;

    registerTrackable(this.atom, this);
  }

  clear(): void {
    this.source.clear();
    this.collection?.notifyAll();
    notifyReactiveAtom(this.atom);
  }

  delete(value: V): boolean {
    const result = this.source.delete(value);
    if (result) {
      this.collection?.notify(value);
      notifyReactiveAtom(this.atom);
    }
    return result;
  }

  forEach(
    callbackfn: (value: V, key: V, map: Set<V>) => void,
    thisArg?: ReactiveSet<V>,
  ): void {
    this.forEach(callbackfn, thisArg);
  }

  get size(): number {
    return this.source.size;
  }

  entries(): IterableIterator<[V, V]> {
    return this.source.entries();
  }

  keys(): IterableIterator<V> {
    return this.source.keys();
  }

  values(): IterableIterator<V> {
    return this.source.values();
  }

  [Symbol.iterator](): IterableIterator<V> {
    return this.source[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return this.source[Symbol.toStringTag];
  }

  add(value: V): this {
    const shouldNotify = !this.source.has(value);
    this.source.add(value);
    if (shouldNotify) {
      this.collection?.notify(value);
      notifyReactiveAtom(this.atom);
    }
    return this;
  }

  has(value: V): boolean {
    if (!this.collection) {
      this.collection = new ReactiveKeys();
    }
    this.collection.track(value);
    return this.source.has(value);
  }
}
