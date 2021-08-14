import {
  untrack,
} from 'compostate';
import { evalDerived, isDerived } from '../../reactivity';
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
  for (let i = 0, len = keys.length, key: string; i < len; i++) {
    key = keys[i];
    if (key === 'ref') {
      const { ref } = props;
      defProp(proxyProps, 'ref', {
        get: () => ref,
      });
    } else if (key === 'children') {
      const { children } = props;
      defProp(proxyProps, 'ref', {
        get: () => children,
      });
    } else {
      const property = props[key];
      const isObject = typeof property === 'object';
      if (isObject && isDerived(property)) {
        defProp(proxyProps, key, {
          get: () => evalDerived(property),
        });
      } else if (isObject && 'value' in property) {
        defProp(proxyProps, key, {
          get: () => property.value,
        });
      } else {
        proxyProps[key] = property;
      }
    }
  }

  return untrack(() => constructor(proxyProps as P));
}
