import {
  untrack,
} from 'compostate';
import {
  Reactive,
  VComponent,
  VNode,
} from '../../types';

// eslint-disable-next-line @typescript-eslint/unbound-method
const defProp = Object.defineProperty;
const getKeys = Object.keys;

export default function renderComponentNode<P extends Record<string, any>>(
  constructor: VComponent<P>,
  props: Reactive<P>,
): VNode {
  // Create a reactive object form for the props
  const proxyProps: { [key: string]: any } = {};

  // Track individual props
  const keys = getKeys(props);
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    const property = props[key];
    if (typeof property === 'function') {
      defProp(proxyProps, key, {
        get: () => property(),
      });
    } else {
      defProp(proxyProps, key, {
        get: () => property,
      });
    }
  }

  return untrack(() => constructor(proxyProps as P));
}
