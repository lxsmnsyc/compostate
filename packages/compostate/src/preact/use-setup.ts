import { useDebugValue, useEffect, useRef, useState } from 'preact/hooks';
import { batchCleanup, syncEffect, untrack } from '../core';
import type { CompositionContext } from '../shared/composition';
import {
  createCompositionContext,
  getCompositionContext,
  runCompositionContext,
} from '../shared/composition';
import type { ReactiveProps } from '../shared/props';
import { createReactiveProps } from '../shared/props';

export type CompostateSetup<Props extends Record<string, any>, T> = (
  props: Props,
) => () => T;

interface Box<T> {
  value: T;
}

function useConstant<T>(supplier: () => T): T {
  const box = useRef<Box<T> | undefined>(undefined);
  if (!box.current) {
    box.current = { value: supplier() };
  }
  return box.current.value;
}

interface ReactiveRef<T> {
  current: T;
  /**
   * Writes without asking the host for a re-render. Used for the value the host
   * has already rendered with.
   */
  sync(next: T): void;
}

function increment(count: number): number {
  return count + 1;
}

function useReactiveRef<T>(supplier: () => T): ReactiveRef<T> {
  const [, setVersion] = useState(0);
  return useConstant(() => {
    let value = supplier();
    return {
      get current(): T {
        return value;
      },
      set current(next: T) {
        if (!Object.is(value, next)) {
          value = next;
          setVersion(increment);
        }
      },
      sync(next: T): void {
        value = next;
      },
    };
  });
}

interface SetupState<Props extends Record<string, any>, T> {
  store: ReactiveProps<Props>;
  context: CompositionContext;
  render: () => T;
  dispose: () => void;
}

function createSetupState<Props extends Record<string, any>, T>(
  setup: CompostateSetup<Props, T>,
  props: Props,
): SetupState<Props, T> {
  const store = createReactiveProps(props);

  let render: (() => T) | undefined;
  let context: CompositionContext | undefined;

  const dispose = batchCleanup(() => {
    createCompositionContext(() => {
      context = getCompositionContext();
      render = untrack(() => setup(store.props));
    });
  });

  if (typeof render !== 'function' || !context) {
    dispose();
    throw new Error(
      'The setup function must return a render function. Received ' +
        typeof render +
        '.',
    );
  }

  return { store, context, render, dispose };
}

export default function useCompostateSetup<
  Props extends Record<string, any>,
  T,
>(setup: CompostateSetup<Props, T>, props: Props): T {
  const state = useConstant(() => createSetupState(setup, props));

  const result = useReactiveRef(() => untrack(state.render));

  useEffect(() => state.dispose, [state]);

  useEffect(() => {
    // The first run of the subscription only exists to register the render
    // function's dependencies. The host already rendered that value, so writing
    // it back must not schedule another render.
    let subscribed = false;
    return syncEffect(() => {
      const next = state.render();
      if (subscribed) {
        result.current = next;
      } else {
        subscribed = true;
        result.sync(next);
      }
    });
  }, [result, state]);

  useEffect(
    () =>
      batchCleanup(() => {
        runCompositionContext(state.context, 'effect');
      }),
    [state],
  );

  useEffect(() => {
    runCompositionContext(state.context, 'mounted');
    return () => {
      runCompositionContext(state.context, 'unmounted');
    };
  }, [state]);

  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
    } else {
      runCompositionContext(state.context, 'updated');
    }
  });

  useEffect(() => {
    state.store.replace(props);
  }, [props, state]);

  useDebugValue(result.current);

  return result.current;
}
