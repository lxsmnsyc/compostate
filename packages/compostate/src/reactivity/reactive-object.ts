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
  onCleanup,
  registerTrackable,
  TRACKING,
} from './core';
import {
  createReactiveKeys,
  destroyReactiveKeys,
  notifyReactiveKeys,
  ReactiveKeys,
  trackReactiveKeys,
} from './nodes/reactive-keys';
import { ReactiveObject } from './types';

class ReactiveObjectHandler<T extends ReactiveObject> {
  collection?: ReactiveKeys<string | symbol | number>;

  atom = createReactiveAtom();

  destroy() {
    if (this.collection) {
      destroyReactiveKeys(this.collection);
    }
    destroyReactiveAtom(this.atom);
  }

  get(target: T, key: string | symbol, receiver: any) {
    if (TRACKING) {
      if (!this.collection) {
        this.collection = createReactiveKeys();
      }
      trackReactiveKeys(this.collection, key);
    }
    return Reflect.get(target, key, receiver);
  }

  has(target: T, key: string | symbol) {
    if (TRACKING) {
      if (!this.collection) {
        this.collection = createReactiveKeys();
      }
      trackReactiveKeys(this.collection, key);
    }
    return Reflect.has(target, key);
  }

  deleteProperty(target: T, key: string | symbol) {
    const deleted = Reflect.deleteProperty(target, key);
    if (deleted) {
      if (this.collection) {
        notifyReactiveKeys(this.collection, key, true);
      }
      notifyReactiveAtom(this.atom);
    }
    return deleted;
  }

  set(target: T, key: string | symbol, value: any, receiver: any) {
    const current = Reflect.get(target, key, receiver);

    const result = Reflect.set(target, key, value, receiver);

    if (result && !Object.is(current, value)) {
      if (this.collection) {
        notifyReactiveKeys(this.collection, key);
      }
      notifyReactiveAtom(this.atom);
    }

    return result;
  }
}

export default function createReactiveObject<T extends ReactiveObject>(
  source: T,
): T {
  const handler = new ReactiveObjectHandler();

  onCleanup(() => {
    handler.destroy();
  });

  const proxy = new Proxy(source, handler);

  registerTrackable(handler.atom, proxy);

  return proxy as T;
}
