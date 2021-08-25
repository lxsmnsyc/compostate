import { computed, computedAtom, isRef } from './core';
import { Ref } from './types';

function isLazy<T>(value: any): value is () => T {
  return typeof value === 'function';
}
export function template<T>(
  strings: TemplateStringsArray,
  ...args: (T | Ref<T> | (() => T))[]
): Ref<string> {
  return computed(() => {
    let result = '';
    let a = 0;
    for (let i = 0, len = strings.length; i < len; i++) {
      result = `${result}${strings[i]}`;
      if (a < args.length) {
        const node = args[a++];
        if (isRef(node)) {
          result = `${result}${String(node.value)}`;
        } else if (isLazy(node)) {
          result = `${result}${String(node())}`;
        } else {
          result = `${result}${String(node)}`;
        }
      }
    }
    return result;
  });
}

export function templateAtom<T>(
  strings: TemplateStringsArray,
  ...args: (T | Ref<T> | (() => T))[]
): () => string {
  return computedAtom(() => {
    let result = '';
    let a = 0;
    for (let i = 0, len = strings.length; i < len; i++) {
      result = `${result}${strings[i]}`;
      if (a < args.length) {
        const node = args[a++];
        if (isRef(node)) {
          result = `${result}${String(node.value)}`;
        } else if (isLazy(node)) {
          result = `${result}${String(node())}`;
        } else {
          result = `${result}${String(node)}`;
        }
      }
    }
    return result;
  });
}
