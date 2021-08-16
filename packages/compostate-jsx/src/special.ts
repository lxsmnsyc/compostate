import {
  atom,
  contextual,
  createContext,
  effect,
  inject,
  map,
  provide,
  reactive,
  Ref,
  resource,
  Resource,
  track,
  watch,
} from 'compostate';
import { VComponent, VNode } from './types';

export interface SuspenseProps {
  fallback: VNode;
  children: VNode;
}

interface SuspenseData {
  capture: <T>(resource: Resource<T>) => void
}

const SuspenseContext = createContext<SuspenseData | undefined>(undefined);

export function Suspense(props: SuspenseProps): VNode {
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
        effect(() => {
          resources.add(track(data));
          return () => {
            resources.delete(data);
          };
        });
      },
    });

    const children = atom<VNode>(undefined);
    const fallback = atom<VNode>(undefined);

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
    boundary.capture(data);
  }
}

export function lazy<P>(mod: () => Promise<VComponent<P>>): VComponent<P> {
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
  children: VNode;
}

export function Offscreen(props: OffscreenProps): VNode {
  const children = atom<VNode>(undefined);
  effect(() => {
    children(props.children);
  });
  return () => props.mount && children();
}

export interface FragmentProps {
  children: VNode;
}

export function Fragment(props: FragmentProps): VNode {
  return () => props.children;
}

interface ForEach<T> {
  (item: T): VNode;
  (item: T, index: Ref<number>): VNode;
}

export interface ForProps<T> {
  in: () => T[]
  each: ForEach<T>;
}

export function For<T>(props: ForProps<T>): VNode {
  return map(() => props.in, () => props.each);
}
