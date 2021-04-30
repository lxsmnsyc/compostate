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
  effect,
  State,
} from 'compostate';
import {
  useConstant,
} from '@lyonph/preact-hooks';
import {
  createNullaryModel,
  createValue,
  useScopedModelExists,
} from 'preact-scoped-model';
import { createStoreAdapter, StoreAdapter } from 'preact-store-adapter';

export interface CompostateCoreContext {
  get: <S, >(state: State<S>) => StoreAdapter<S>;
}

const CompostateCore = createNullaryModel(() => {
  const stores = useConstant(() => (
    new Map<string, StoreAdapter<any>>()
  ));

  return useConstant<CompostateCoreContext>(() => ({
    get: <S, >(reference: State<S>): StoreAdapter<S> => {
      const store = stores.get(reference.key);

      if (store) {
        return store as StoreAdapter<S>;
      }

      const newStore = createStoreAdapter({
        read: () => reference.value,
        subscribe: (callback) => effect(() => {
          reference.watch();
          callback();
        }),
        onCleanup: () => {
          stores.delete(reference.key);
        },
      });

      stores.set(reference.key, newStore);

      return newStore;
    },
  }));
}, {
  displayName: 'CompostateCore',
});

export const useCompostateCore = createValue(CompostateCore);

export function useCompostateRestriction(): void {
  const context = useScopedModelExists(CompostateCore);

  if (!context) {
    throw new Error(`
  <CompostateRoot> is missing from the ancestor component tree.
  Make sure that the <CompostateRoot> is mounted first before
  trying to use the hooks.
`);
  }
}

export default CompostateCore;
