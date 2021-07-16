import {
  batch,
  batchEffects,
  computed,
  effect,
  EffectCleanup,
  onError,
  reactive,
  ref,
  Ref,
  Resource,
  track,
  untrack,
} from 'compostate';
import {
  Fragment,
  Suspense,
  SuspenseProps,
} from './core';
import {
  createMarker,
  createText,
  insert,
  registerEvent,
  remove,
  setAttribute,
} from './dom';
import ErrorBoundary, { ERROR_BOUNDARY } from './error-boundary';
import {
  ERROR,
  MOUNT,
  UNMOUNT,
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
  error?: ErrorBoundary;
  suspense?: SuspenseData;
  provider?: ProviderData;
}

function renderWithBoundaries<T>(
  boundary: Boundary,
  renderFn: () => T,
): T | undefined {
  return renderWithContext(
    () => {
      const popError = ERROR_BOUNDARY.push(boundary.error);
      const popProvider = PROVIDER.push(boundary.provider);
      const popSuspense = SUSPENSE.push(boundary.suspense);

      return () => {
        popError();
        popSuspense();
        popProvider();
      };
    },
    renderFn,
  );
}

function handleError(boundary: ErrorBoundary | undefined, error: Error): void {
  if (boundary) {
    boundary.capture(error);
  } else {
    throw error;
  }
}

function setupErrorBoundary(boundary?: ErrorBoundary): void {
  onError((error) => {
    handleError(boundary, error);
  });
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
      // Bridge error boundary across untrack
      setupErrorBoundary(parentErrorBoundary);

      Array.from(children).forEach((child) => {
        // Create a marker for each child
        const childMarker = createMarker();
        effect(() => {
          // Insert new marker before the parent marker
          insert(root, childMarker, marker);

          // Render the child
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
      // Setup parent error boundary
      // because of untrack scope
      setupErrorBoundary(parentErrorBoundary);

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
              // Ref handler
              if (key === 'ref') {
                effect(() => {
                  const elRef = (newProps as RefAttributes<Element>).ref;
                  if (elRef) {
                    elRef.value = el;
                  }
                });
              // Children handler
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
                      // We don't have to suspend here
                      // since the element itself isn't
                      // rendered yet.
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
                          handleError(parentErrorBoundary, error);
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
            // If the element received a suspense ref
            // we have to make sure that the element
            // isn't inserted until the suspense boundary
            // resolves
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
          const popError = ERROR.push([]);

          // Create an error boundary and link
          // the parent error boundary
          const errorBoundary = new ErrorBoundary(parentErrorBoundary);

          // Create a provider boundary
          const provider = {
            data: reactive({}),
            parent: parentProvider,
          };

          let result: VNode;

          // Batch effects inside the constructor
          // so that it only runs when the element
          // actually gets committed.
          // This is useful in SSR so that effects
          // never run and only run on client-side.
          const flushEffects = batchEffects(() => {
            result = renderWithBoundaries(
              {
                error: parentErrorBoundary,
                suspense: parentSuspense,
                provider,
              },
              () => constructor(unwrappedProps),
            );
          });

          // Get all captured lifecycle callbacks
          const mounts = popMount();
          const unmounts = popUnmount();
          const errors = popError();

          // Register all error handlers
          // We do this since if we use compostate's
          // onError, it gets registered to the parent
          // handler.
          errors.forEach((handler) => {
            effect(() => errorBoundary.register(handler));
          });

          // Create an effect scope
          // this is to properly setup
          // the error boundary
          effect(() => {
            setupErrorBoundary(errorBoundary);

            // Render constructor result
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

            // Run lifecycles
            effect(() => {
              untrack(() => {
                mounts.forEach((mount) => {
                  batch(() => {
                    mount();
                  });
                });
              });

              return () => {
                untrack(() => {
                  unmounts.forEach((unmount) => {
                    batch(() => {
                      unmount();
                    });
                  });
                });
              };
            });

            // Flush effects
            effect(() => {
              flushEffects();
            });
          });
        } else if (constructor === Fragment) {
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
        } else if (constructor === Suspense) {
          // Suspense
          const suspend = ref(false);

          // This contains all of the tracked
          // resource instances that were suspended
          const resources = reactive<Set<Resource<any>>>(new Set());

          // Track the resource size and set the value
          // of suspend to false when the resource size
          // becomes zero (no suspended resources)
          effect(() => {
            suspend.value = track(resources).size > 0;
          });

          // Track the resources and remove all
          // failed an successful resource
          effect(() => {
            new Set(track(resources)).forEach((resource) => {
              if (resource.status === 'success') {
                resources.delete(resource);
              } else if (resource.status === 'failure') {
                resources.delete(resource);

                // Forward the error to the error boundary.
                throw resource.value;
              }
            });
          });

          // Create a Suspense boundary instance.
          const capture = <T>(resource: Resource<T>) => {
            resources.add(resource);
          };

          const currentSuspense = {
            parent: parentSuspense,
            capture,
          };

          // Create markers for the fallback and the
          // children branches
          const fallbackBranch = createMarker();
          const childrenBranch = createMarker();

          effect(() => {
            // Mount both markers
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
                  () => renderInternal(
                    root,
                    value,
                    fallbackBranch,
                    // Since the fallback branch
                    // only renders when suspended
                    // We make sure to flip the value
                    // to consider DOM elements
                    computed(() => !suspend.value),
                  ),
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
                  () => renderInternal(
                    root,
                    value,
                    childrenBranch,
                    // Forward the suspend state
                    suspend,
                  ),
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

  // Reactive VNode
  return untrack(() => (
    effect(() => {
      setupErrorBoundary(parentErrorBoundary);
      // Track the VNode
      const unwrappedChild = unwrapRef(children);

      effect(() => (
        renderWithBoundaries(
          {
            error: parentErrorBoundary,
            provider: parentProvider,
            suspense: parentSuspense,
          },
          () => (
            renderInternal(root, unwrappedChild, marker, suspended)
          ),
        )
      ));
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
    if (constructor === Fragment) {
      return renderToString(props.children);
    }
    if (constructor === Suspense) {
      return renderToString(props.fallback);
    }
  }
  return renderToString((props as WithChildren).children);
}
