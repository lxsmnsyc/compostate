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
export {
  startTransition,
  isTransitionPending,
  batch,
  unbatch,
  createRoot,
  // captures
  capturedBatchCleanup,
  capturedErrorBoundary,
  capturedContext,
  captured,
  // cleanup
  onCleanup,
  batchCleanup,
  unbatchCleanup,
  // error boundary
  onError,
  errorBoundary,
  captureError,
  // computation
  computation,
  // effects
  effect,
  // computed
  // subscription
  untrack,
  watch,
  // context
  contextual,
  createContext,
  Context,
  writeContext as provide,
  readContext as inject,
  writeContext,
  readContext,
  // selector
  selector,
  // atoms
  atom,
  Atom,
  computedAtom,
  // signal
  signal,
  Signal,
  // deferred
  deferredAtom,
} from './reactivity/core';
// Extensions
export {
  ref,
  isRef,
  computed,
  deferred,
} from './reactivity/refs';
export {
  readonly,
  isReadonly,
} from './reactivity/readonly';
export {
  isTrackable,
  track,
} from './reactivity/trackable';
export {
  map,
  index,
} from './reactivity/array';
export {
  debounce,
  debouncedAtom,
} from './reactivity/debounce';
export {
  default as reactive,
} from './reactivity/reactive';
export {
  default as resource,
  Resource,
  ResourceOptions,
} from './reactivity/resource';
export {
  spread,
  destructure,
  Spread,
} from './reactivity/spread';
export {
  template,
  templateAtom,
} from './reactivity/template';
export {
  Effect,
  Cleanup,
  ErrorCapture,
  Ref,
} from './reactivity/types';
