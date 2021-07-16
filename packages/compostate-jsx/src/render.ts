import {
  batch,
  computed,
  effect,
  EffectCleanup,
  reactive,
  ref,
  Ref,
  Resource,
  track,
  untrack,
} from 'compostate';
import { SuspenseProps } from './core';
import {
  createMarker,
  createText,
  insert,
  registerEvent,
  remove,
  setAttribute,
} from './dom';
import {
  ERROR_BOUNDARY,
  MOUNT,
  UNMOUNT,
  EFFECT,
  ERROR,
  ErrorCapture,
} from './lifecycle';
import { PROVIDER, ProviderData } from './provider';
import { SUSPENSE, SuspenseData } from './suspense';
import {
  Reactive,
  RefAttributes,
  VNode,
  WithChildren,
} from './types';

function unwrapRef<T>(baseRef: T | Ref<T>): T {
  if (baseRef && typeof baseRef === 'object' && 'value' in baseRef) {
    return baseRef.value;
  }
  return baseRef;
}

function renderWithContext<T>(
  pushContext: () => EffectCleanup,
  renderFn: () => T,
): T {
  const popContext = pushContext();
  try {
    return renderFn();
  } finally {
    popContext();
  }
}

interface Boundary {
  error?: ErrorCapture;
  suspense?: SuspenseData;
  provider?: ProviderData;
}

function renderWithBoundaries<T>(
  boundary: Boundary,
  renderFn: () => T,
): T | undefined {
  try {
    return renderWithContext(
      () => {
        const popErrorBoundary = boundary.error
          ? ERROR_BOUNDARY.push(boundary.error)
          : undefined;
        const popProvider = PROVIDER.push(boundary.provider);
        const popSuspense = SUSPENSE.push(boundary.suspense);

        return () => {
          popSuspense();
          popProvider();
          popErrorBoundary?.();
        };
      },
      renderFn,
    );
  } catch (error) {
    if (boundary.error) {
      boundary.error(error);
      return undefined;
    }
    throw error;
  }
}

function renderInternal(
  root: HTMLElement,
  children: VNode,
  marker: Node | null = null,
  suspended: Ref<boolean> | boolean = false,
): EffectCleanup {
  // Re-capture current boundaries
  const parentErrorBoundary = ERROR_BOUNDARY.getContext();
  const parentProvider = PROVIDER.getContext();
  const parentSuspense = SUSPENSE.getContext();

  if (Array.isArray(children)) {
    return untrack(() => effect(() => {
      Array.from(children).forEach((child) => {
        const childMarker = createMarker();
        effect(() => {
          insert(root, childMarker, marker);

          effect(() => (
            renderWithBoundaries(
              {
                error: parentErrorBoundary,
                provider: parentProvider,
                suspense: parentSuspense,
              },
              () => renderInternal(root, child, childMarker, suspended),
            )
          ));

          return () => {
            remove(childMarker);
          };
        });
      });
    }));
  }
  if (typeof children === 'string' || typeof children === 'number') {
    const node = createText(`${children}`);

    return untrack(() => effect(() => {
      if (!unwrapRef(suspended)) {
        insert(root, node, marker);
      }
      return () => {
        remove(node);
      };
    }));
  }
  if (children == null || typeof children === 'boolean') {
    return () => { /* no-op */ };
  }
  if ('type' in children) {
    return untrack(() => effect(() => {
      effect(() => {
        // Unwrap constructor (useful if constructor is reactively changed).
        const constructor = unwrapRef(children.type);

        // Merge children with props
        const newProps: Reactive<any> = {
          ...children.props,
        };

        // Construct DOM element
        if (typeof constructor === 'string') {
          const el = document.createElement(constructor);

          effect(() => {
            Object.keys(newProps).forEach((key) => {
              if (key === 'ref') {
                effect(() => {
                  const elRef = (newProps as RefAttributes<Element>)[key];
                  if (elRef) {
                    elRef.value = el;
                  }
                });
              } else if (key === 'children') {
                effect(() => {
                  const value = (newProps as WithChildren).children;
                  if (value != null) {
                    return renderWithBoundaries(
                      {
                        error: parentErrorBoundary,
                        provider: parentProvider,
                        suspense: parentSuspense,
                      },
                      () => renderInternal(el, value),
                    );
                  }
                  return undefined;
                });
              } else {
                effect(() => {
                  const property = unwrapRef(newProps[key]);

                  // Event Handlers
                  if (key.startsWith('on')) {
                    const wrappedEvent = <E extends Event>(evt: E) => {
                      // In case of synchronous calls
                      untrack(() => {
                        // Allow update batching
                        try {
                          batch(() => {
                            (property as EventListener)(evt);
                          });
                        } catch (error) {
                          if (parentErrorBoundary) {
                            parentErrorBoundary(error);
                          } else {
                            throw error;
                          }
                        }
                      });
                    };

                    effect(() => registerEvent(el, key, wrappedEvent));
                  } else if (key === 'style') {
                    // TODO Style Object parsing
                  } else if (typeof property === 'boolean') {
                    setAttribute(el, key, property ? '' : null);
                  } else {
                    setAttribute(el, key, property);
                  }
                });
              }
            });
          });

          effect(() => {
            if (!unwrapRef(suspended)) {
              insert(root, el, marker);
            }

            return () => {
              remove(el);
            };
          });
        } else if (typeof constructor === 'function') {
          // Create a reactive object form for the props
          const unwrappedProps = reactive<Record<string, any>>({});

          effect(() => {
            // Track individual props
            Object.keys(newProps).forEach((key) => {
              if (key === 'ref') {
                effect(() => {
                  (unwrappedProps as RefAttributes<any>).ref = (newProps as RefAttributes<any>).ref;
                });
              } else if (key === 'children') {
                effect(() => {
                  (unwrappedProps as WithChildren).children = (newProps as WithChildren).children;
                });
              } else {
                effect(() => {
                  unwrappedProps[key] = unwrapRef(newProps[key]);
                });
              }
            });
          });

          // Push lifecycle hooks
          const popMount = MOUNT.push([]);
          const popUnmount = UNMOUNT.push([]);
          const popEffect = EFFECT.push([]);
          const popError = ERROR.push([]);

          const provider = {
            data: reactive({}),
            parent: parentProvider,
          };

          const result = (
            renderWithBoundaries(
              {
                error: parentErrorBoundary,
                suspense: parentSuspense,
                provider,
              },
              () => constructor(unwrappedProps),
            )
          );

          const mounts = popMount();
          const unmounts = popUnmount();
          const effects = popEffect();
          const errors = popError();

          const errorBoundary = (error: any) => {
            // Check if there are any handlers
            if (errors.length > 0) {
              untrack(() => {
                try {
                  errors.forEach((capture) => {
                    batch(() => {
                      capture(error);
                    });
                  });
                } catch (newError) {
                  // onError handlers threw an error,
                  // forward to parent
                  if (parentErrorBoundary) {
                    parentErrorBoundary(newError);
                  } else {
                    throw newError;
                  }
                }
              });
            } else if (parentErrorBoundary) {
              parentErrorBoundary(error);
            } else {
              throw error;
            }
          };

          effect(() => (
            renderWithBoundaries(
              {
                error: errorBoundary,
                provider,
                suspense: parentSuspense,
              },
              () => (
                renderInternal(root, result, marker, suspended)
              ),
            )
          ));

          effect(() => {
            untrack(() => {
              try {
                mounts.forEach((mount) => {
                  batch(() => {
                    mount();
                  });
                });
              } catch (error) {
                errorBoundary(error);
              }
            });

            return () => {
              untrack(() => {
                try {
                  unmounts.forEach((unmount) => {
                    batch(() => {
                      unmount();
                    });
                  });
                } catch (error) {
                  errorBoundary(error);
                }
              });
            };
          });

          effect(() => {
            try {
              effects.forEach((callback) => {
                effect(callback);
              });
            } catch (error) {
              errorBoundary(error);
            }
          });
        } else if (constructor === 1) {
          // Fragment renderer
          effect(() => {
            const value = (newProps as WithChildren).children;
            if (value != null) {
              effect(() => (
                renderWithBoundaries(
                  {
                    error: parentErrorBoundary,
                    provider: parentProvider,
                    suspense: parentSuspense,
                  },
                  () => renderInternal(root, value, marker, suspended),
                )
              ));
            }
          });
        } else {
          // Suspense
          const suspend = ref(false);
          const resources = reactive<Set<Resource<any>>>(new Set());

          effect(() => {
            suspend.value = track(resources).size > 0;
          });

          effect(() => {
            new Set(track(resources)).forEach((resource) => {
              if (resource.status === 'success') {
                resources.delete(resource);
              } else if (resource.status === 'failure') {
                resources.delete(resource);
                if (parentErrorBoundary) {
                  parentErrorBoundary(resource.value);
                } else {
                  throw resource.value;
                }
              }
            });
          });

          const capture = <T>(resource: Resource<T>) => {
            resources.add(resource);
          };

          const currentSuspense = {
            parent: parentSuspense,
            capture,
          };

          const fallbackBranch = createMarker();
          const childrenBranch = createMarker();

          effect(() => {
            insert(root, fallbackBranch, marker);
            insert(root, childrenBranch, marker);

            // Render fallback
            effect(() => {
              const value = (newProps as SuspenseProps).fallback;

              if (value) {
                return renderWithBoundaries(
                  {
                    error: parentErrorBoundary,
                    provider: parentProvider,
                    suspense: parentSuspense,
                  },
                  () => renderInternal(root, value, fallbackBranch, computed(() => !suspend.value)),
                );
              }
              return undefined;
            });

            // Render children
            effect(() => {
              const value = (newProps as SuspenseProps).children;
              if (value != null) {
                return renderWithBoundaries(
                  {
                    error: parentErrorBoundary,
                    provider: parentProvider,
                    suspense: currentSuspense,
                  },
                  () => renderInternal(root, value, childrenBranch, suspend),
                );
              }
              return undefined;
            });

            return () => {
              remove(fallbackBranch);
              remove(childrenBranch);
            };
          });
        }
      });
    }));
  }

  return untrack(() => (
    effect(() => {
      const unwrappedChild = unwrapRef(children);
      return renderWithBoundaries(
        {
          error: parentErrorBoundary,
          provider: parentProvider,
          suspense: parentSuspense,
        },
        () => (
          renderInternal(root, unwrappedChild, marker, suspended)
        ),
      );
    })
  ));
}

export function render(root: HTMLElement, element: VNode): () => void {
  return renderInternal(root, element);
}

// Based on https://github.com/WebReflection/domtagger/blob/master/esm/sanitizer.js
const VOID_ELEMENTS = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;

function propsToString(props: Record<string, any>): string {
  return Object.entries(props).map(([key, value]) => {
    switch (key) {
      case 'ref':
      case 'children':
      case 'innerHTML':
      case 'textContent':
        return '';
      default:
        if (key.startsWith('on')) {
          return '';
        }
        return `${value}`;
    }
  }).join(' ');
}

export function renderToString(element: VNode): string {
  if (Array.isArray(element)) {
    return element.map((el) => renderToString(el)).join('');
  }
  if (element == null || typeof element === 'boolean') {
    return '';
  }
  if (typeof element === 'string' || typeof element === 'number') {
    return `${element}`;
  }
  if ('value' in element) {
    return renderToString(element.value);
  }
  const { type, props } = element;
  const constructor = untrack(() => unwrapRef(type));

  if (constructor) {
    if (typeof constructor === 'string') {
      if (VOID_ELEMENTS.test(constructor)) {
        return `<${constructor} ${propsToString(props)} />`;
      }
      let content = '';
      Object.entries(props).forEach(([key, value]) => {
        switch (key) {
          case 'textContent':
          case 'innerHTML':
            content = value as string;
            break;
          case 'children':
            content = renderToString(value);
            break;
          default:
            break;
        }
      });

      return `<${constructor} ${propsToString(props)}>${content}</${constructor}>`;
    }
    if (typeof constructor === 'function') {
      return renderToString(constructor(props));
    }
  }
  return renderToString((props as WithChildren).children);
}
