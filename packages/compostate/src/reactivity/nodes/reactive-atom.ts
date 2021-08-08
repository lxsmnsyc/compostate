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
import { untrack } from '../create-root';
import { Cleanup } from '../types';
import {
  addLinkedWorkDependency,
  addLinkedWorkDependent,
  BATCH_UPDATES,
  createLinkedWork,
  LinkedWork,
  runLinkedWork,
  TRACKING,
} from './linked-work';

export interface ReactiveAtom extends LinkedWork {
  listeners?: Set<() => void>;
}

export function createReactiveAtom(): ReactiveAtom {
  const atom: ReactiveAtom = createLinkedWork(() => {
    untrack(() => {
      atom.listeners?.forEach((listener) => {
        listener();
      });
    });
  });

  return atom;
}

export function trackReactiveAtom(target: ReactiveAtom): void {
  if (TRACKING) {
    addLinkedWorkDependent(target, TRACKING);
    addLinkedWorkDependency(TRACKING, target);
  }
}

export function notifyReactiveAtom(target: ReactiveAtom): void {
  if (BATCH_UPDATES) {
    BATCH_UPDATES.add(target);
  } else {
    runLinkedWork(target);
  }
}

export function subscribeReactiveAtom(target: ReactiveAtom, listener: () => void): Cleanup {
  if (!target.listeners) {
    target.listeners = new Set();
  }
  target.listeners.add(listener);
  return () => {
    target.listeners?.delete(listener);
  };
}
