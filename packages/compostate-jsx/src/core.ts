import {
  Ref, effect, untrack, reactive,
} from 'compostate';
import { MOUNT, UNMOUNT, EFFECT } from './lifecycle';
import {
  VNode, Reactive, Renderable, WithChildren, VComponent, Attributes, BaseProps,
} from './types';
import { DOMAttributes } from './types/dom';
import { HTMLAttributes, CompostateHTML } from './types/html';
import { SVGAttributes, CompostateSVG } from './types/svg';

let id = 0;

function getID(): number {
  const current = id;
  id += 1;
  return current;
}

function unwrapRef<T>(ref: T | Ref<T>): T {
  if (ref && typeof ref === 'object' && 'value' in ref) {
    return ref.value;
  }
  return ref;
}

function mountChildren(root: HTMLElement, children: VNode, marker: Node | null): void {
  if (Array.isArray(children)) {
    children.forEach((child) => {
      const newMarker = document.createComment(`${getID()}`);
      effect(() => {
        root.insertBefore(newMarker, marker);
        return () => {
          root.removeChild(newMarker);
        };
      });
      mountChildren(root, child, newMarker);
    });
  } else if (typeof children === 'string' || typeof children === 'number') {
    const node = document.createTextNode(`${children}`);

    effect(() => {
      root.insertBefore(node, marker);

      return () => {
        root.removeChild(node);
      };
    });
  } else if (children == null || typeof children === 'boolean') {
    // no-op
  } else if ('render' in children) {
    effect(() => children.render(root, marker));
  } else {
    effect(() => {
      const unwrappedChild = unwrapRef(children);

      mountChildren(root, unwrappedChild, marker);
    });
  }
}

export function c<P extends HTMLAttributes<T>, T extends HTMLElement>(
  type: (keyof CompostateHTML) | Ref<keyof CompostateHTML>,
  props: Reactive<P>,
  ...children: VNode[]
): Renderable;
export function c<P extends SVGAttributes<T>, T extends SVGElement>(
  type: (keyof CompostateSVG) | Ref<keyof CompostateSVG>,
  props: Reactive<P>,
  ...children: VNode[]
): Renderable;
export function c<P extends DOMAttributes<T>, T extends Element>(
  type: string | Ref<string>,
  props: Reactive<P>,
  ...children: VNode[]
): Renderable;
export function c<P extends WithChildren>(
  type: null | Ref<null>,
  props: Reactive<Attributes & P>,
  ...children: VNode[]
): Renderable;
export function c<P>(
  type: VComponent<P> | Ref<VComponent<P>>,
  props: Reactive<Attributes & P>,
  ...children: VNode[]
): Renderable;
export function c<P extends BaseProps<P>, T>(
  type: string | Ref<string> | VComponent<P> | Ref<VComponent<P>> | null | Ref<null>,
  props: Reactive<P>,
  ...children: VNode[]
): Renderable {
  return {
    render(root, parentMarker) {
      return untrack(() => (
        effect(() => {
          const constructor = unwrapRef(type);

          const newProps: Reactive<P> = {
            ...props,
            children: [
              ...(props?.children ?? []),
              ...children,
            ],
          };

          if (typeof constructor === 'string') {
            const el = document.createElement(constructor);

            effect(() => {
              Object.keys(newProps).forEach((key) => {
                if (key === 'ref') {
                  effect(() => {
                    const ref = newProps[key];
                    if (ref) {
                      (ref as unknown as Ref<T>).value = el as unknown as T;
                    }
                  });
                } else if (key === 'children') {
                  effect(() => {
                    const value = newProps.children;
                    if (value != null) {
                      mountChildren(el, value, null);
                    }
                  });
                } else {
                  effect(() => {
                    const property = unwrapRef(newProps[key]);

                    if (key.startsWith('on')) {
                      effect(() => {
                        const actualKey = key.substring(2).toLowerCase();

                        el.addEventListener(actualKey, property);

                        return () => {
                          el.removeEventListener(actualKey, property);
                        };
                      });
                    } else if (key === 'className') {
                      el.setAttribute('class', property);
                    } else {
                      el.setAttribute(key, property);
                    }
                  });
                }
              });
            });

            effect(() => {
              root.insertBefore(el, parentMarker ?? null);

              return () => {
                root.removeChild(el);
              };
            });
          } else if (constructor) {
            const unwrappedProps = reactive({} as P);

            effect(() => {
              Object.keys(newProps).forEach((key) => {
                if (key === 'ref') {
                  effect(() => {
                    unwrappedProps.ref = newProps.ref;
                  });
                } else if (key === 'children') {
                  effect(() => {
                    unwrappedProps.children = newProps.children;
                  });
                } else {
                  effect(() => {
                    unwrappedProps[key as keyof P] = unwrapRef(newProps[key] as P[keyof P]);
                  });
                }
              });
            });

            const popMount = MOUNT.push([]);
            const popUnmount = UNMOUNT.push([]);
            const popEffect = EFFECT.push([]);
            const result = constructor(unwrappedProps);
            const mounts = popMount();
            const unmounts = popUnmount();
            const effects = popEffect();

            effect(() => (
              mountChildren(root, result, parentMarker ?? null)
            ));

            effect(() => {
              untrack(() => {
                mounts.forEach((mount) => {
                  mount();
                });
              });

              return () => {
                untrack(() => {
                  unmounts.forEach((unmount) => {
                    unmount();
                  });
                });
              };
            });

            effect(() => {
              effects.forEach((callback) => {
                effect(callback);
              });
            });
          } else {
            effect(() => {
              const value = newProps.children;
              if (value != null) {
                mountChildren(root, value, parentMarker ?? null);
              }
            });
          }
        })
      ));
    },
  };
}

export function Fragment(props: WithChildren): VNode {
  return c(null, {
    children: props.children,
  });
}
