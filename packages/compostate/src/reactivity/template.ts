import { Atom, computed } from './core';
import { Ref } from './types';

export default function template<T>(
  strings: TemplateStringsArray,
  ...args: (T | Ref<T> | Atom<T>)[]
): Ref<string> {
  return computed(() => {
    let result = '';
    let a = 0;
    for (let i = 0, len = strings.length; i < len; i++) {
      result = `${result}${strings[i]}`;
      if (a < args.length) {
        const node = args[a++];
        if (typeof node === 'string') {
          result = `${result}${String(node)}`;
        } else if (typeof node === 'function') {
          result = `${result}${String(node())}`;
        } else {
          result = `${result}${String(node.value)}`;
        }
      }
    }
    return result;
  });
}
