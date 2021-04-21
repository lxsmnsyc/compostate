import {
  Subscription,
  useMemoCondition,
  useSubscription,
} from '@lyonph/react-hooks';
import {
  batchEffects,
  effect,
  state,
  State,
} from 'compostate';
import { useDebugValue, useEffect, useState } from 'react';
import { useCompostateRestriction } from '../CompostateCore';

export default function useCompostateSetup<S>(setup: () => () => S): S {
  useCompostateRestriction();

  const higher = useMemoCondition(() => {
    let computed: State<() => S> = {} as State<() => S>;

    const effects = batchEffects(() => {
      computed = state(() => setup());
    });

    return {
      effects,
      computed,
    };
  }, setup);

  const lower = useMemoCondition(() => {
    let computed: State<S> = {} as State<S>;

    const effects = batchEffects(() => {
      computed = state(higher.computed.value);
    });

    return {
      effects,
      computed,
    };
  }, higher);

  const subscription = useMemoCondition((): Subscription<S> => ({
    read: () => lower.computed.value,
    subscribe: (callback) => effect(() => {
      lower.computed.watch();
      callback();
    }),
  }), lower);

  const value = useSubscription(subscription);

  useDebugValue(value);

  const [highVersion, setHighVersion] = useState(0);
  const [lowVersion, setLowVersion] = useState(0);

  useEffect(() => (
    higher.effects.subscribe(() => setHighVersion((current) => current + 1))
  ), [higher]);
  useEffect(() => (
    lower.effects.subscribe(() => setLowVersion((current) => current + 1))
  ), [lower]);

  useEffect(() => {
    higher.effects.flush();
  }, [highVersion, higher]);

  useEffect(() => {
    lower.effects.flush();
  }, [lowVersion, lower]);

  useEffect(() => () => {
    higher.computed.destroy(true);
  }, [higher]);
  useEffect(() => () => {
    lower.computed.destroy(true);
  }, [lower]);

  return value;
}
