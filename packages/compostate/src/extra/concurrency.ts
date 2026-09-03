import { ResourceNotReadyError } from '../core/suspense';

export type UnwrapSignal<T> = T extends () => infer R ? R : never;

export type Result<T> =
  | { type: 'pending'; request: Promise<unknown> }
  | { type: 'success'; value: T }
  | { type: 'failure'; value: unknown };

export function toResult<T>(signal: () => T): Result<T> {
  try {
    return { type: 'success', value: signal() };
  } catch (error) {
    if (error instanceof ResourceNotReadyError) {
      return { type: 'pending', request: error.request };
    }
    return { type: 'failure', value: error };
  }
}

export type ResultSignals<T> = T extends [infer F, ...infer Rest]
  ? [Result<UnwrapSignal<F>>, ...ResultSignals<Rest>]
  : T extends [infer F]
    ? [Result<UnwrapSignal<F>>]
    : T extends Array<infer F>
      ? Result<UnwrapSignal<F>>[]
      : [];

export function waitForNone<T extends (() => any)[]>(
  signals: T,
): ResultSignals<T> {
  const results: Result<unknown>[] = [];
  for (let i = 0, len = signals.length; i < len; i++) {
    results.push(toResult(signals[i]));
  }
  return results as ResultSignals<T>;
}

export type UnwrapSignals<T> = T extends [infer F, ...infer Rest]
  ? [UnwrapSignal<F>, ...UnwrapSignals<Rest>]
  : T extends [infer F]
    ? [UnwrapSignal<F>]
    : [];

/**
 * Reads every signal and only resolves once all of them have settled. Suspends
 * while at least one of them is still pending, and throws an `AggregateError`
 * when any of the settled signals failed.
 */
export function waitForAll<T extends (() => any)[]>(
  signals: T,
): UnwrapSignals<T> {
  const results = waitForNone<T>(signals);

  const values: unknown[] = [];
  const errors: unknown[] = [];
  const pending: Promise<unknown>[] = [];
  for (let i = 0, len = results.length; i < len; i++) {
    const result = results[i];
    if (result.type === 'pending') {
      pending.push(result.request);
    }
    if (result.type === 'success') {
      values.push(result.value);
    }
    if (result.type === 'failure') {
      errors.push(result.value);
    }
  }

  if (pending.length > 0) {
    throw new ResourceNotReadyError(Promise.all(pending));
  }
  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
  return values as UnwrapSignals<T>;
}

/**
 * Returns the value of the first signal that resolved successfully. Suspends
 * while none of them succeeded and at least one is still pending, and throws an
 * `AggregateError` once every signal has failed.
 */
export function waitForAny<T>(signals: (() => T)[]): T {
  const results = waitForNone<(() => T)[]>(signals);
  const errors: unknown[] = [];
  const pending: Promise<unknown>[] = [];
  for (let i = 0, len = results.length; i < len; i++) {
    const result = results[i];
    if (result.type === 'success') {
      return result.value;
    }
    if (result.type === 'failure') {
      errors.push(result.value);
    }
    if (result.type === 'pending') {
      pending.push(result.request);
    }
  }
  if (pending.length > 0) {
    throw new ResourceNotReadyError(Promise.race(pending));
  }
  throw new AggregateError(errors);
}

/**
 * Returns the value of the first signal that settled, whether it succeeded or
 * failed. Suspends while every signal is still pending.
 */
export function waitForRace<T>(signals: (() => T)[]): T {
  const results = waitForNone<(() => T)[]>(signals);
  const pending: Promise<unknown>[] = [];
  for (let i = 0, len = results.length; i < len; i++) {
    const result = results[i];
    if (result.type === 'success') {
      return result.value;
    }
    if (result.type === 'failure') {
      throw result.value;
    }
    pending.push(result.request);
  }
  throw new ResourceNotReadyError(Promise.race(pending));
}
