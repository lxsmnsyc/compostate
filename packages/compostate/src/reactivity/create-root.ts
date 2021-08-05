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
import { CLEANUP, setCleanup } from './nodes/cleanup';
import { BATCH_EFFECTS, setBatchEffects } from './nodes/effect';
import {
  BATCH_UPDATES,
  setBatchUpdates,
  setTracking,
  TRACKING,
} from './nodes/linked-work';

export function unbatch<T>(callback: () => T): T {
  const parent = BATCH_UPDATES;
  setBatchUpdates(undefined);
  try {
    return callback();
  } finally {
    setBatchUpdates(parent);
  }
}

export function unbatchCleanup<T>(callback: () => T): T {
  const parentInstance = CLEANUP;
  setCleanup(undefined);
  try {
    return callback();
  } finally {
    setCleanup(parentInstance);
  }
}

export function unbatchEffects<T>(callback: () => T): T {
  const parent = BATCH_EFFECTS;
  setBatchEffects(undefined);
  try {
    return callback();
  } finally {
    setBatchEffects(parent);
  }
}

export function untrack<T>(callback: () => T): T {
  const parent = TRACKING;
  setTracking(undefined);
  try {
    return callback();
  } finally {
    setTracking(parent);
  }
}

export function createRoot<T>(callback: () => T): T {
  return untrack(() => (
    unbatch(() => (
      unbatchEffects(() => (
        unbatchCleanup(callback)
      ))
    ))
  ));
}
