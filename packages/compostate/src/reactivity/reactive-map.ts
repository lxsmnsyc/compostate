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
import ReactiveKeys from './reactive-keys';

export default class ReactiveMap<K, V> implements Map<K, V> {
  private source: Map<K, V>;

  private collection = new ReactiveKeys<K>();

  constructor(source: Map<K, V>) {
    this.source = source;
  }

  clear(): void {
    this.source.clear();
    this.collection.notifyAll();
  }

  delete(key: K): boolean {
    const result = this.source.delete(key);
    if (result) {
      this.collection.notify(key);
    }
    return result;
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: ReactiveMap<K, V>,
  ): void {
    this.forEach(callbackfn, thisArg);
  }

  get size(): number {
    return this.source.size;
  }

  entries(): IterableIterator<[K, V]> {
    return this.source.entries();
  }

  keys(): IterableIterator<K> {
    return this.source.keys();
  }

  values(): IterableIterator<V> {
    return this.source.values();
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.source[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return this.source[Symbol.toStringTag];
  }

  get(key: K): V | undefined {
    this.collection.track(key);
    return this.source.get(key);
  }

  set(key: K, value: V): this {
    const current = this.source.get(key);
    if (!Object.is(current, value)) {
      this.source.set(key, value);
      this.collection.notify(key);
    }
    return this;
  }

  has(key: K): boolean {
    this.collection.track(key);
    return this.source.has(key);
  }
}
