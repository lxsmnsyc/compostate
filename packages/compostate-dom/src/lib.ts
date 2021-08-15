import {
  untrack,
  createRoot,
  batchCleanup,
  ref,
  Cleanup,
  resource,
  contextual,
  errorBoundary,
  computation,
  createContext,
  Resource,
  provide,
  watch,
  track,
  reactive,
  atom,
  inject,
  onCleanup,
} from 'compostate';
import { JSX } from './jsx';

export function root<T>(fn: (dispose: () => void) => T): T {
  return createRoot(() => {
    let result: T | undefined;
    let currentCleanup: Cleanup | undefined;
    const dispose = () => {
      currentCleanup?.();
    };
    currentCleanup = batchCleanup(() => {
      result = fn(dispose);
    });
    return result as T;
  });
}

export const effect = computation;

// only updates when boolean expression changes
export function memo<T>(fn: () => T, equal?: boolean): () => T {
  const o = ref(untrack(fn));
  effect((prev) => {
    const res = fn();
    if (!equal || Object.is(prev, res)) {
      o.value = res;
    }
    return res;
  });
  return () => o.value;
}

type PropsWithChildren<P> = P & { children?: JSX.Element };
export type Component<P = {}> = (props: PropsWithChildren<P>) => JSX.Element;
export type ComponentProps<
  T extends keyof JSX.IntrinsicElements | Component<any>
> = T extends Component<infer P>
  ? P
  : T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : {};

export function createComponent<T>(Comp: Component<T>, props: T): JSX.Element {
  return untrack(() => Comp(props));
}

export function withErrorBoundary<P>(Comp: Component<P>): Component<P> {
  return (props) => errorBoundary(() => Comp(props));
}

export function withContext<P>(Comp: Component<P>): Component<P> {
  return (props) => contextual(() => Comp(props));
}

export interface SuspenseProps {
  fallback: JSX.Element;
  children: JSX.Element;
}

interface SuspenseData {
  capture: <T>(resource: Resource<T>) => Cleanup
}

const SuspenseContext = createContext<SuspenseData | undefined>(undefined);

export function Suspense(props: SuspenseProps): JSX.Element {
  return contextual(() => {
    // This contains all of the tracked
    // resource instances that were suspended
    const resources = reactive<Set<Resource<any>>>(new Set());

    // Track the resources and remove all
    // failed an successful resource
    watch(() => track(resources), (value) => {
      const copy = new Set(value);
      if (copy.size) {
        for (const data of copy) {
          if (data.status === 'success') {
            resources.delete(data);
          } else if (data.status === 'failure') {
            resources.delete(data);

            // Forward the error to the error boundary.
            throw data.value;
          }
        }
      }
    });

    provide(SuspenseContext, {
      capture: <T>(data: Resource<T>) => {
        resources.add(data);
        return () => {
          resources.delete(data);
        };
      },
    });

    const children = atom<JSX.Element>(undefined);
    const fallback = atom<JSX.Element>(undefined);

    effect(() => {
      children(props.children);
    });
    effect(() => {
      fallback(props.fallback);
    });

    // Track the resource size and set the value
    // of suspend to false when the resource size
    // becomes zero (no suspended resources)
    return () => (track(resources).size > 0 ? fallback() : children());
  });
}

export function suspend<T>(data: Resource<T>): void {
  const boundary = inject(SuspenseContext);

  if (boundary) {
    onCleanup(boundary.capture(data));
  }
}

export function lazy<P>(mod: () => Promise<Component<P>>): Component<P> {
  return (props) => {
    const data = resource(mod);

    suspend(data);

    return () => {
      if (data.status === 'success') {
        return data.value(props);
      }
      return undefined;
    };
  };
}

export interface OffscreenProps {
  mount?: boolean;
  children: JSX.Element;
}

export function Offscreen(props: OffscreenProps): JSX.Element {
  const children = atom<JSX.Element>(undefined);
  effect(() => {
    children(props.children);
  });
  return () => props.mount && children();
}
