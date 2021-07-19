import {
  batch,
  effect,
  Ref,
  untrack,
} from 'compostate';
import { Marker, registerEvent, setAttribute } from '../../dom';
import { handleError } from '../../error-boundary';
import { claimHydration, HYDRATION } from '../../hydration';
import { Reactive, RefAttributes, ShallowReactive } from '../../types';
import { DOMAttributes } from '../../types/dom';
import { Boundary, RenderChildren } from '../types';
import unwrapRef from '../unwrap-ref';
import { watchMarkerForNode } from '../watch-marker';

export default function renderHostNode<P extends DOMAttributes<Element>>(
  boundary: Boundary,
  root: HTMLElement,
  constructor: string,
  props: Reactive<P> & RefAttributes<Element>,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean> | boolean = false,
): void {
  const hydration = HYDRATION.getContext();
  const claim = hydration ? claimHydration(hydration) : null;
  let el = document.createElement(constructor);

  if (hydration) {
    if (claim) {
      if (claim.tagName !== constructor.toUpperCase()) {
        throw new Error(`Hydration mismatch. (Expected: ${constructor}, Received: ${claim.tagName})`);
      }
      el = claim as HTMLElement;
    } else {
      throw new Error(`Hydration mismatch. (Expected: ${constructor}, Received: null)`);
    }
  }

  Object.keys(props).forEach((key) => {
    // Ref handler
    if (key === 'ref') {
      effect(() => {
        const elRef = props.ref;
        if (elRef) {
          elRef.value = el;
        }
      });
    // Children handler
    } else if (key === 'children') {
      effect(() => {
        renderChildren(boundary, el, props.children);
      });
    } else {
      effect(() => {
        const property = unwrapRef(props[key as keyof typeof props]);

        // Event Handlers
        if (key.startsWith('on')) {
          const wrappedEvent = <E extends Event>(evt: E) => {
            // In case of synchronous calls
            untrack(() => {
              // Allow update batching
              try {
                batch(() => {
                  (property as unknown as EventListener)(evt);
                });
              } catch (error) {
                handleError(boundary.error, error);
              }
            });
          };

          effect(() => registerEvent(el, key, wrappedEvent));
        } else if (key === 'style') {
          // TODO Style Object parsing
        } else if (typeof property === 'boolean') {
          setAttribute(el, key, property ? 'true' : null);
        } else {
          setAttribute(el, key, property as string);
        }
      });
    }
  });

  watchMarkerForNode(root, marker, el, suspended);
}
