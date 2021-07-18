/* eslint-disable no-param-reassign */
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
  For,
  ForProps,
  Fragment,
  Offscreen,
  OffscreenProps,
  Portal,
  PortalProps,
  Suspense,
  SuspenseProps,
} from './core';
import diff from './diff';
import {
  createMarker,
  createText,
  insert,
  Marker,
  registerEvent,
  remove,
  setAttribute,
} from './dom';
import ErrorBoundary from './error-boundary';
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
  ShallowReactive,
  VNode,
  WithChildren,
} from './types';

function unwrapRef<T>(baseRef: T | Ref<T>): T {
  if (baseRef && typeof baseRef === 'object' && 'value' in baseRef) {
    return baseRef.value;
  }
  return baseRef;
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

interface Boundary {
  error?: ErrorBoundary;
  suspense?: SuspenseData;
  provider?: ProviderData;
}

function watchMarkerForMarker(
  root: HTMLElement,
  parent: ShallowReactive<Marker | null>,
  child: Marker,
): void {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;

  effect(() => {
    // Insert new marker before the parent marker
    const actualParent = unwrapRef(parent);
    if (actualParent !== previousParent) {
      parentVersion = undefined;
      previousParent = actualParent;
    }
    if (actualParent) {
      if (parentVersion !== actualParent.version) {
        parentVersion = actualParent.version;
        insert(root, child.node, actualParent.node);
        child.version += 1;
      }
    } else {
      insert(root, child.node);
    }

    return () => {
      remove(child.node);
    };
  });
}

function watchMarkerForNode(
  root: HTMLElement,
  parent: ShallowReactive<Marker | null>,
  child: Node,
  suspended: Ref<boolean> | boolean = false,
): void {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;

  effect(() => {
    // Do not insert node if the tree is suspended
    const actualParent = unwrapRef(parent);
    if (actualParent !== previousParent) {
      parentVersion = undefined;
      previousParent = actualParent;
    }
    if (!unwrapRef(suspended)) {
      if (actualParent) {
        // Check if the parent marker has changed position
        if (parentVersion !== actualParent.version) {
          parentVersion = actualParent.version;
          insert(root, child, actualParent.node);
        }
      } else {
        // No parent, just append child
        insert(root, child);
      }
    }

    return () => {
      remove(child);
    };
  });
}

function renderInternal(
  boundary: Boundary,
  root: HTMLElement,
  children: VNode,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean> | boolean = false,
): EffectCleanup {
  if (Array.isArray(children)) {
    return untrack(() => effect(() => {
      // Bridge error boundary across untrack
      setupErrorBoundary(boundary.error);

      Array.from(children).forEach((child) => {
        // Create a marker for each child
        const childMarker = createMarker();

        watchMarkerForMarker(root, marker, childMarker);

        // Render the child
        effect(() => (
          renderInternal(boundary, root, child, childMarker, suspended)
        ));
      });
    }));
  }
  if (typeof children === 'string' || typeof children === 'number') {
    const node = createText(`${children}`);

    return untrack(() => (
      effect(() => {
        watchMarkerForNode(root, marker, node, suspended);
      })
    ));
  }
  if (children == null || typeof children === 'boolean') {
    return () => { /* no-op */ };
  }
  if ('type' in children) {
    return untrack(() => effect(() => {
      // Setup parent error boundary
      // because of untrack scope
      setupErrorBoundary(boundary.error);

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
                    // We don't have to suspend here
                    // since the element itself isn't
                    // rendered yet.
                    return renderInternal(boundary, el, value);
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
                          handleError(boundary.error, error);
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
            watchMarkerForNode(root, marker, el, suspended);
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
          const errorBoundary = new ErrorBoundary(boundary.error);

          // Create a provider boundary
          const provider = {
            data: reactive({}),
            parent: boundary.provider,
          };

          let result: VNode;

          // Batch effects inside the constructor
          // so that it only runs when the element
          // actually gets committed.
          // This is useful in SSR so that effects
          // never run and only run on client-side.
          const flushEffects = untrack(() => (
            batchEffects(() => {
              const popSuspense = SUSPENSE.push(boundary.suspense);
              const popProvider = PROVIDER.push(boundary.provider);
              try {
                result = constructor(unwrappedProps);
              } finally {
                popSuspense();
                popProvider();
              }
            })
          ));

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

            const newBoundary = {
              suspense: boundary.suspense,
              error: errorBoundary,
              provider,
            };

            // Render constructor result
            effect(() => (
              renderInternal(newBoundary, root, result, marker, suspended)
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
          effect(() => (
            renderInternal(
              boundary,
              root,
              (newProps as WithChildren).children,
              marker,
              suspended,
            )
          ));
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
            parent: boundary.suspense,
            capture,
          };

          // Create markers for the fallback and the
          // children branches
          const fallbackBranch = createMarker();
          const childrenBranch = createMarker();

          watchMarkerForMarker(root, marker, fallbackBranch);
          watchMarkerForMarker(root, marker, childrenBranch);

          // Render fallback
          effect(() => {
            const value = (newProps as SuspenseProps).fallback;

            if (value) {
              return renderInternal(
                boundary,
                root,
                value,
                fallbackBranch,
                // Since the fallback branch
                // only renders when suspended
                // We make sure to flip the value
                // to consider DOM elements
                computed(() => !suspend.value),
              );
            }
            return undefined;
          });

          // Render children
          effect(() => {
            const value = (newProps as SuspenseProps).children;
            if (value != null) {
              return renderInternal(
                {
                  ...boundary,
                  suspense: currentSuspense,
                },
                root,
                value,
                childrenBranch,
                // Forward the suspend state
                suspend,
              );
            }
            return undefined;
          });
        } else if (constructor === Offscreen) {
          const offscreenMarker = createMarker();

          const suspend = computed(() => (
            !unwrapRef((newProps as OffscreenProps).mount)
          ));

          watchMarkerForMarker(root, marker, offscreenMarker);

          effect(() => (
            renderInternal(
              boundary,
              root,
              (newProps as SuspenseProps).children,
              offscreenMarker,
              // Forward the suspend state
              suspend,
            )
          ));
        } else if (constructor === Portal) {
          effect(() => (
            renderInternal(
              boundary,
              unwrapRef((newProps as PortalProps).target),
              (newProps as PortalProps).children,
              marker,
              suspended,
            )
          ));
        } else if (constructor === For) {
          // The memoized array based on the source array
          const memory = reactive<any[]>([]);
          // The lifecycles of children
          const lifecycles: EffectCleanup[] = [];
          // Markers for the child position
          const markers: Marker[] = [];
          // Lifecycles of markers
          const markersLifecycle: EffectCleanup[] = [];
          // The position for memoized children lifecycle
          const position: Ref<number>[] = [];

          effect(() => {
            // Track the given array
            const tracked = track(unwrapRef((newProps as ForProps<any>).in));

            // Expand markers if the tracked array has suffix inserts
            untrack(() => {
              // for (let i = tracked.length; i < markers.length; i += 1) {
              //   markersLifecycle[i]();
              //   delete markers[i];
              // }
              for (let i = markers.length; i < tracked.length; i += 1) {
                markers[i] = createMarker();
                markersLifecycle[i] = untrack(() => (
                  effect(() => {
                    watchMarkerForMarker(root, marker, markers[i]);
                  })
                ));
              }
            });
            // Untrack for un-intended tracking
            untrack(() => {
              // Perform Myers diff on the tracked array
              const difference = diff(memory, tracked);

              batch(() => {
                let memoryIndex = 0;
                let trackedIndex = 0;

                const nextItem = () => {
                  // Update the position of the moved item
                  // This could happen when insert or delete
                  // operations are added between noop
                  position[memoryIndex].value = trackedIndex;
                  memoryIndex += 1;
                  trackedIndex += 1;
                };

                const deleteItem = () => {
                  // Splicing ensures that the
                  // array shifts
                  memory.splice(memoryIndex, 1);
                  position.splice(memoryIndex, 1);
                  // Clean the lifecycle
                  lifecycles[memoryIndex]();
                  lifecycles.splice(memoryIndex, 1);
                };

                const insertItem = () => {
                  memory.splice(memoryIndex, 0, tracked[trackedIndex]);
                  // Create a reference position for the mounting child
                  const newPosition = ref(trackedIndex);
                  position.splice(memoryIndex, 0, newPosition);
                  lifecycles.splice(memoryIndex, 0, untrack(() => (
                    effect(() => (
                      renderInternal(
                        boundary,
                        root,
                        // Reactively track changes
                        // on the produced children
                        computed(() => (
                          unwrapRef((newProps as ForProps<any>).each)(
                            untrack(() => tracked[trackedIndex]),
                          )
                        )),
                        // Track marker positions
                        computed(() => markers[newPosition.value]),
                        suspended,
                      )
                    ))
                  )));
                  nextItem();
                };

                difference.forEach((operation) => {
                  switch (operation) {
                    case 'replace':
                      deleteItem();
                      insertItem();
                      break;
                    case 'noop':
                      nextItem();
                      break;
                    case 'delete':
                      deleteItem();
                      break;
                    case 'insert':
                      insertItem();
                      break;
                    default:
                      break;
                  }
                });
              });
            });
          });

          effect(() => () => {
            lifecycles.forEach((cleanup) => {
              cleanup();
            });
            markersLifecycle.forEach((cleanup) => {
              cleanup();
            });
          });
        }
      });
    }));
  }

  // Reactive VNode
  return untrack(() => (
    effect(() => {
      setupErrorBoundary(boundary.error);
      // Track the VNode
      const unwrappedChild = unwrapRef(children);

      effect(() => (
        renderInternal(boundary, root, unwrappedChild, marker, suspended)
      ));
    })
  ));
}

export function render(root: HTMLElement, element: VNode): () => void {
  return renderInternal({}, root, element);
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
