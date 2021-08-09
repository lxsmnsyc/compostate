import {
  effect,
  errorBoundary,
  reactive,
} from 'compostate';
import { PROVIDER, setProvider } from '../../provider';
import { evalDerived } from '../../reactivity';
import {
  Reactive,
  RefAttributes,
  VComponent,
  VNode,
  WithChildren,
} from '../../types';

export default function renderComponentNode<P extends Record<string, any>>(
  constructor: VComponent<P>,
  props: Reactive<P>,
): VNode {
  return errorBoundary(() => {
    // Create a reactive object form for the props
    const unwrappedProps = reactive<P>({} as P);

    // Track individual props
    Object.keys(props).forEach((key) => {
      if (key === 'ref') {
        (unwrappedProps as RefAttributes<any>).ref = (props as RefAttributes<any>).ref;
      } else if (key === 'children') {
        (unwrappedProps as WithChildren).children = (props as WithChildren).children;
      } else {
        const property = props[key];
        if (typeof property === 'object') {
          if ('value' in property) {
            effect(() => {
              unwrappedProps[key] = property.value;
            });
          } else if ('derive' in property) {
            effect(() => {
              unwrappedProps[key] = evalDerived(property);
            });
          } else {
            unwrappedProps[key] = property;
          }
        } else {
          unwrappedProps[key] = property;
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
      return constructor(unwrappedProps);
    } finally {
      setProvider(parentProvider);
    }
  });
}
