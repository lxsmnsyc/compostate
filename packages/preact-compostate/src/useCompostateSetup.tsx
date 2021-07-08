import { useDebugValue, useEffect, useRef } from 'preact/hooks';
import {
  effect,
  isolate,
  state,
  State,
} from 'compostate';
import {
  useConstant,
  useReactiveRef,
} from '@lyonph/preact-hooks';
import {
  createCompositionContext,
  pushCompositionContext,
  runCompositionContext,
} from './composition';

export type PropObject<Props extends Record<string, any>> = {
  [key in keyof Props]: State<Props[key]>;
};

function createPropObject<Props extends Record<string, any>>(
  props: Props,
): PropObject<Props> {
  const propEntries = Object.entries(props);
  const propStates = propEntries.map(([key, value]) => [
    key,
    isolate(() => (
      state({
        value: () => value,
      })
    )),
  ]);
  return Object.fromEntries(propStates) as PropObject<Props>;
}

export type CompostateSetup<Props extends Record<string, any>, T> = (
  (props: PropObject<Props>) => () => T
);

export default function useCompostateSetup<Props extends Record<string, any>, T>(
  setup: CompostateSetup<Props, T>,
  props: Props,
): T {
  const currentState = useConstant(() => {
    const propObject = createPropObject(props);
    const context = createCompositionContext();
    const popContext = pushCompositionContext(context);
    let render: (() => T) | undefined;

    const lifecycle = isolate(() => (
      effect(() => {
        render = setup(propObject);
      })
    ));

    popContext();

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
    isolate(() => (
      effect(() => {
        result.current = currentState.render();
      })
    ))
  ), [result, currentState]);

  useEffect(() => (
    isolate(() => (
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
      const propState = currentState.propObject[key];
      if (propState) {
        propState.value = value;
      } else {
        currentState.propObject[key as keyof Props] = state(() => value);
      }
    });
  }, [props, currentState]);

  useDebugValue(result.current);

  return result.current;
}
