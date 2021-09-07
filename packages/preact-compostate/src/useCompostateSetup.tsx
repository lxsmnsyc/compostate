import { useDebugValue, useEffect, useRef } from 'preact/hooks';
import {
  effect,
  reactive,
  untrack,
} from 'compostate';
import {
  useConstant,
  useReactiveRef,
} from '@lyonph/preact-hooks';
import {
  createCompositionContext,
  getCompositionContext,
  runCompositionContext,
} from './composition';

function createPropObject<Props extends Record<string, any>>(
  props: Props,
): Props {
  return reactive({
    ...props,
  });
}

export type CompostateSetup<Props extends Record<string, any>, T> = (
  (props: Props) => () => T
);

export default function useCompostateSetup<Props extends Record<string, any>, T>(
  setup: CompostateSetup<Props, T>,
  props: Props,
): T {
  const currentState = useConstant(() => {
    const propObject = createPropObject(props);
    const { context, render, lifecycle } = createCompositionContext(() => {
      let result: (() => T) | undefined;

      const lc = untrack(() => (
        effect(() => {
          result = setup(propObject);
        })
      ));

      return {
        render: result,
        context: getCompositionContext(),
        lifecycle: lc,
      };
    });

    if (typeof render !== 'function') {
      throw new Error(`
render is not a function. This maybe because the setup effect did not run
or the setup returned a value that's not a function.
`);
    }

    return {
      propObject,
      context,
      render,
      lifecycle,
    };
  });

  const result = useReactiveRef(() => currentState.render());

  useEffect(() => currentState.lifecycle, [currentState]);

  useEffect(() => (
    untrack(() => (
      effect(() => {
        result.current = currentState.render();
      })
    ))
  ), [result, currentState]);

  useEffect(() => (
    untrack(() => (
      effect(() => {
        runCompositionContext(
          currentState.context,
          'effect',
          [],
        );
      })
    ))
  ), [currentState]);

  useEffect(() => {
    runCompositionContext(
      currentState.context,
      'mounted',
      [],
    );
    return () => {
      runCompositionContext(
        currentState.context,
        'unmounted',
        [],
      );
    };
  }, [currentState]);

  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
    } else {
      runCompositionContext(
        currentState.context,
        'updated',
        [],
      );
    }
  });

  useEffect(() => {
    Object.entries(props).forEach(([key, value]) => {
      currentState.propObject[key as keyof Props] = value;
    });
  }, [props, currentState]);

  useDebugValue(result.current);

  return result.current;
}
