import {
  batch,
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
import VirtualFragment from './fragment';
import {
  ERROR_BOUNDARY,
  MOUNT,
  UNMOUNT,
  EFFECT,
  ERROR,
} from './lifecycle';
import { PROVIDER } from './provider';
import { SUSPENSE } from './suspense';
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

function renderInternal(
  root: HTMLElement,
  children: VNode,
): EffectCleanup {
  if (Array.isArray(children)) {
    return untrack(() => (
      effect(() => {
        children.forEach((child) => {
          const container = new VirtualFragment();
          // Re-capture current error boundary
          const parentErrorBoundary = ERROR_BOUNDARY.getContext();
          const parentProvider = PROVIDER.getContext();
          const parentSuspense = SUSPENSE.getContext();
          effect(() => {
            // Mount the marker first as it is
            // used for position reference for child nodes
            root.appendChild(container.element);

            effect(() => {
              // Since the effect may re-evaluate with losing context
              // We need to re-push the captured context
              if (parentErrorBoundary) {
                const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
                const popParentProvider = PROVIDER.push(parentProvider);
                const popSuspense = SUSPENSE.push(parentSuspense);
                try {
                  container.rewrap();
                  return renderInternal(container.element, child);
                } catch (error) {
                  parentErrorBoundary(error);
                  return undefined;
                } finally {
                  container.unwrap();
                  popSuspense();
                  popParentProvider();
                  popErrorBoundary();
                }
              }
              container.rewrap();
              const cleanup = renderInternal(container.element, child);
              container.unwrap();
              return cleanup;
            });

            return () => {
              container.rewrap();
              root.removeChild(container.element);
            };
          });
        });
      })
    ));
  }
  if (typeof children === 'string' || typeof children === 'number') {
    const node = document.createTextNode(`${children}`);

    return untrack(() => (
      effect(() => {
        root.appendChild(node);
        return () => {
          root.removeChild(node);
        };
      })
    ));
  }
  if (children == null || typeof children === 'boolean') {
    return () => { /** no-op */ };
  }
  if ('type' in children) {
    let stop: EffectCleanup;

    // If there's no error boundary (e.g. root component),
    // make sure that the whole tree is unmounted.
    const parentErrorBoundary = ERROR_BOUNDARY.getContext() ?? ((error) => {
      stop?.();

      // Re-throw error on a global context
      throw error;
    });

    const parentProvider = PROVIDER.getContext();
    const parentSuspense = SUSPENSE.getContext();

    // Isolate effect tracking
    stop = untrack(() => (
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
                    const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
                    const popProvider = PROVIDER.push(parentProvider);
                    const popSuspense = SUSPENSE.push(parentSuspense);
                    try {
                      return renderInternal(el, value);
                    } catch (error) {
                      parentErrorBoundary(error);
                    } finally {
                      popSuspense();
                      popProvider();
                      popErrorBoundary();
                    }
                  }
                  return undefined;
                });
              } else {
                effect(() => {
                  const property = unwrapRef(newProps[key]);

                  // Event Handlers
                  if (key.startsWith('on')) {
                    effect(() => {
                      // Extract event name
                      const event = key.substring(2).toLowerCase();
                      // Check if event name ends with 'capture'
                      const capture = event.endsWith('capture');
                      // Capture actual DOM event
                      const actualEvent = event.substring(
                        0,
                        event.length - (capture ? 7 : 0),
                      );

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

                      // Register
                      el.addEventListener(actualEvent, wrappedEvent, {
                        capture,
                      });
                      // Unregister
                      return () => {
                        el.removeEventListener(actualEvent, wrappedEvent, {
                          capture,
                        });
                      };
                    });
                  } else if (key === 'className') {
                    el.setAttribute('class', property);
                  } else if (key === 'textContent') {
                    el.textContent = property as string;
                  } else if (key === 'innerHTML') {
                    el.innerHTML = property as string;
                  } else if (key === 'style') {
                    // TODO Style Object parsing
                  } else if (key === 'value') {
                    (el as HTMLInputElement).value = property;
                  } else if (typeof property === 'string' || typeof property === 'number') {
                    el.setAttribute(key, `${property}`);
                  } else if (property) {
                    el.setAttribute(key, '');
                  } else {
                    el.removeAttribute(key);
                  }
                });
              }
            });
          });

          effect(() => {
            root.appendChild(el);
            return () => {
              el.parentNode?.removeChild(el);
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

          let result: VNode;

          const provider = {
            data: reactive({}),
            parent: parentProvider,
          };

          const popParentErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
          const popProvider = PROVIDER.push(provider);
          const popSuspense = SUSPENSE.push(parentSuspense);
          try {
            result = constructor(unwrappedProps);
          } catch (error) {
            parentErrorBoundary(error);
          } finally {
            popSuspense();
            popProvider();
            popParentErrorBoundary();
          }

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
                  parentErrorBoundary(newError);
                }
              });
            } else {
              parentErrorBoundary(error);
            }
          };

          const container = new VirtualFragment();

          effect(() => {
            root.appendChild(container.element);

            effect(() => {
              const popErrorBoundary = ERROR_BOUNDARY.push(errorBoundary);
              const popChildProvider = PROVIDER.push(provider);
              const popParentSuspense = SUSPENSE.push(parentSuspense);
              try {
                // container.rewrap();
                return renderInternal(container.element, result);
              } catch (error) {
                errorBoundary(error);
              } finally {
                // container.unwrap();
                popParentSuspense();
                popChildProvider();
                popErrorBoundary();
              }
              return undefined;
            });

            return () => {
              // container.rewrap();
              container.element.parentNode?.removeChild(container.element);
            };
          });

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
          const container = new VirtualFragment();
          effect(() => {
            root.appendChild(container.element);

            // effect(() => {
            //   container.unwrap();
            //   return () => {
            //     container.rewrap();
            //   };
            // });

            effect(() => {
              const value = (newProps as WithChildren).children;
              if (value != null) {
                const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
                const popProvider = PROVIDER.push(parentProvider);
                const popSuspense = SUSPENSE.push(parentSuspense);
                try {
                  // container.rewrap();
                  return renderInternal(container.element, value);
                } catch (error) {
                  parentErrorBoundary(error);
                } finally {
                  // container.unwrap();
                  popSuspense();
                  popProvider();
                  popErrorBoundary();
                }
              }
              return undefined;
            });

            return () => {
              root.removeChild(container.element);
            };
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
                parentErrorBoundary(resource.value);
                resources.delete(resource);
              }
            });
          });

          const capture = <T>(resource: Resource<T>) => {
            resources.add(resource);
          };

          const suspenseContainer = new VirtualFragment();

          effect(() => {
            root.appendChild(suspenseContainer.element);

            // Render fallback
            const fallbackBranch = new VirtualFragment();
            effect(() => {
              const value = (newProps as SuspenseProps).fallback;

              if (value) {
                const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
                const popProvider = PROVIDER.push(parentProvider);
                try {
                  return renderInternal(fallbackBranch.element, value);
                } catch (error) {
                  parentErrorBoundary(error);
                } finally {
                  popProvider();
                  popErrorBoundary();
                }
              }
              return undefined;
            });

            // Render children
            const childrenBranch = new VirtualFragment();
            effect(() => {
              const value = (newProps as SuspenseProps).children;
              if (value != null) {
                const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
                const popProvider = PROVIDER.push(parentProvider);
                const popSuspense = SUSPENSE.push(capture);
                try {
                  return renderInternal(childrenBranch.element, value);
                } catch (error) {
                  parentErrorBoundary(error);
                } finally {
                  popSuspense();
                  popProvider();
                  popErrorBoundary();
                }
              }
              return undefined;
            });

            effect(() => {
              // suspenseContainer.rewrap();
              const newChild = suspend.value ? fallbackBranch : childrenBranch;
              const oldChild = suspend.value ? childrenBranch : fallbackBranch;
              // oldChild.rewrap();
              if (suspenseContainer.element === oldChild.element.parentNode) {
                suspenseContainer.element.replaceChild(newChild.element, oldChild.element);
              } else {
                suspenseContainer.element.appendChild(newChild.element);
              }
              // newChild.unwrap();
              // suspenseContainer.unwrap();
            });

            return () => {
              // suspenseContainer.rewrap();
              root.removeChild(suspenseContainer.element);
            };
          });
        }
      })
    ));

    return stop;
  }

  // Capture current error boundary
  const parentErrorBoundary = ERROR_BOUNDARY.getContext();
  const parentProvider = PROVIDER.getContext();
  const container = new VirtualFragment();
  return untrack(() => effect(() => {
    effect(() => {
      root.appendChild(container.element);
      effect(() => {
        const unwrappedChild = unwrapRef(children);
        // Since the effect may re-evaluate with losing context
        // We need to re-push the captured context
        if (parentErrorBoundary) {
          const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
          const popProvider = PROVIDER.push(parentProvider);
          try {
            // container.rewrap();
            return renderInternal(container.element, unwrappedChild);
          } catch (error) {
            parentErrorBoundary(error);
            return undefined;
          } finally {
            // container.unwrap();
            popProvider();
            popErrorBoundary();
          }
        }
        // container.rewrap();
        const cleanup = renderInternal(container.element, unwrappedChild);
        // container.unwrap();
        return cleanup;
      });
      return () => {
        // container.rewrap();
        root.removeChild(container.element);
      };
    });
  }));
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
