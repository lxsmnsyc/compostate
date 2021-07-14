import {
  batch,
  effect,
  EffectCleanup,
  reactive,
  Ref,
  untrack,
} from 'compostate';
import {
  ERROR_BOUNDARY,
  MOUNT,
  UNMOUNT,
  EFFECT,
  ERROR,
} from './lifecycle';
import { PROVIDER } from './provider';
import {
  Reactive,
  RefAttributes,
  VNode,
  WithChildren,
} from './types';

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

export function render(
  root: HTMLElement,
  children: VNode,
  marker: Node | null = null,
): EffectCleanup {
  if (Array.isArray(children)) {
    return untrack(() => (
      effect(() => {
        children.forEach((child) => {
          // Create node marker
          const newMarker = document.createComment(`${getID()}`);
          effect(() => {
            // Mount the marker first as it is
            // used for position reference for child nodes
            root.insertBefore(newMarker, marker);
          });
          // Re-capture current error boundary
          const parentErrorBoundary = ERROR_BOUNDARY.getContext();
          const parentProvider = PROVIDER.getContext();
          effect(() => {
            // Since the effect may re-evaluate with losing context
            // We need to re-push the captured context
            if (parentErrorBoundary) {
              const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
              const popParentProvider = PROVIDER.push(parentProvider);
              try {
                return render(root, child, newMarker);
              } catch (error) {
                parentErrorBoundary(error);
                return undefined;
              } finally {
                popParentProvider();
                popErrorBoundary();
              }
            }
            return render(root, child, newMarker);
          });
          // Perform marker cleanup after all child nodes have been removed.
          effect(() => () => {
            if (newMarker.parentNode === root) {
              root.removeChild(newMarker);
            }
          });
        });
      })
    ));
  }
  if (typeof children === 'string' || typeof children === 'number') {
    const node = document.createTextNode(`${children}`);

    return untrack(() => (
      effect(() => {
        root.insertBefore(node, marker);
        return () => {
          if (node.parentNode === root) {
            root.removeChild(node);
          }
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
      stop();

      // Re-throw error on a global context
      throw error;
    });

    const parentProvider = PROVIDER.getContext();

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
                  const ref = (newProps as RefAttributes<Element>)[key];
                  if (ref) {
                    ref.value = el;
                  }
                });
              } else if (key === 'children') {
                effect(() => {
                  const value = (newProps as WithChildren).children;
                  if (value != null) {
                    const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
                    const popProvider = PROVIDER.push(parentProvider);
                    try {
                      return render(el, value, null);
                    } catch (error) {
                      parentErrorBoundary(error);
                    } finally {
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
            root.insertBefore(el, marker);
            return () => {
              if (el.parentNode === root) {
                root.removeChild(el);
              }
            };
          });
        } else if (constructor) {
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
          try {
            result = constructor(unwrappedProps);
          } catch (error) {
            parentErrorBoundary(error);
          } finally {
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

          effect(() => {
            const popErrorBoundary = ERROR_BOUNDARY.push(errorBoundary);
            const popChildProvider = PROVIDER.push(provider);
            try {
              return render(root, result, marker);
            } catch (error) {
              errorBoundary(error);
            } finally {
              popChildProvider();
              popErrorBoundary();
            }
            return undefined;
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
        } else {
          // Fragment renderer
          effect(() => {
            const value = (newProps as WithChildren).children;
            if (value != null) {
              const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
              const popProvider = PROVIDER.push(parentProvider);
              try {
                return render(root, value, marker);
              } catch (error) {
                parentErrorBoundary(error);
              } finally {
                popProvider();
                popErrorBoundary();
              }
            }
            return undefined;
          });
        }
      })
    ));

    return stop;
  }

  // Capture current error boundary
  const parentErrorBoundary = ERROR_BOUNDARY.getContext();
  const parentProvider = PROVIDER.getContext();
  return untrack(() => (
    effect(() => {
      const unwrappedChild = unwrapRef(children);
      // Since the effect may re-evaluate with losing context
      // We need to re-push the captured context
      if (parentErrorBoundary) {
        const popErrorBoundary = ERROR_BOUNDARY.push(parentErrorBoundary);
        const popProvider = PROVIDER.push(parentProvider);
        try {
          return render(root, unwrappedChild, marker);
        } catch (error) {
          parentErrorBoundary(error);
          return undefined;
        } finally {
          popProvider();
          popErrorBoundary();
        }
      }
      return render(root, unwrappedChild, marker);
    })
  ));
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
