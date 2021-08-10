import {
  errorBoundary,
} from 'compostate';
import { PROVIDER, setProvider } from '../../provider';
import { evalDerived } from '../../reactivity';
import {
  Reactive,
  VComponent,
  VNode,
} from '../../types';

export default function renderComponentNode<P extends Record<string, any>>(
  constructor: VComponent<P>,
  props: Reactive<P>,
): VNode {
  return errorBoundary(() => {
    // Create a reactive object form for the props
    const proxyProps: { [key: string]: any }= {};

    // Track individual props
    Object.keys(props).forEach((key) => {
      if (key === 'ref') {
        Object.defineProperty(proxyProps, 'ref', {
          get: () => props.ref,
        });
      } else if (key === 'children') {
        Object.defineProperty(proxyProps, 'children', {
          get: () => props.children,
        });
      } else {
        const property = props[key];
        if (typeof property === 'object') {
          if ('value' in property) {
            Object.defineProperty(proxyProps, key, {
              get: () => property.value,
            });
          } else if ('derive' in property) {
            Object.defineProperty(proxyProps, key, {
              get: () => evalDerived(property),
            });
          } else {
            proxyProps[key] = property;
          }
        } else {
          proxyProps[key] = property;
        }
      }
    });

    // Create a provider boundary
    const parentProvider = PROVIDER;

    setProvider({
      data: {},
      parent: parentProvider,
    });
    try {
      return constructor(proxyProps as P);
    } finally {
      setProvider(parentProvider);
    }
  });
}
