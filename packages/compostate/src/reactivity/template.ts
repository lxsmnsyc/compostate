import { computed } from './core';
import { Ref } from './types';

export default function template(
  strings: TemplateStringsArray,
  ...args: (string | Ref<string>)[]
): Ref<string> {
  return computed(() => {
    let result = '';
    let a = 0;
    for (let i = 0; i < strings.length; i += 1) {
      result = `${result}${strings[i]}`;
      if (a < args.length) {
        const node = args[a];
        if (typeof node === 'string') {
          result = `${result}${node}`;
        } else {
          result = `${result}${node.value}`;
        }
        a += 1;
      }
    }
    return result;
  });
}
