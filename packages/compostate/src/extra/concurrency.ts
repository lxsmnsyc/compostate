import { ResourceNotReadyError } from '../core/suspense';

export type UnwrapSignal<T> = T extends () => infer R ? R : never;

type Result<T> =
  | { type: 'pending' }
  | { type: 'success'; value: T }
  | { type: 'failure'; value: unknown };

export function toResult<T>(signal: () => T): Result<T> {
  try {
    return { type: 'success', value: signal() };
  } catch (error) {
    if (error instanceof ResourceNotReadyError) {
      return { type: 'pending' };
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

export function waitForAll<T extends (() => any)[]>(
  signals: T,
): UnwrapSignals<T> {
  const results = waitForNone<T>(signals);

  const values: unknown[] = [];
  const errors: unknown[] = [];
  for (let i = 0, len = results.length; i < len; i++) {
    const result = results[i];
    if (result.type === 'pending') {
      throw new ResourceNotReadyError();
    }
    if (result.type === 'success') {
      values.push(result.value);
    }
    if (result.type === 'failure') {
      errors.push(result.value);
    }
  }

  if (errors.length > 0) {
    // TODO shim
    throw new AggregateError(errors);
  }
  return values as UnwrapSignals<T>;
}

export function waitForAny<T>(signals: (() => T)[]): T {
  const results = waitForNone<(() => T)[]>(signals);
  const errors: unknown[] = [];
  for (let i = 0, len = results.length; i < len; i++) {
    const result = results[i];
    if (result.type === 'success') {
      return result.value;
    }
    if (result.type === 'failure') {
      errors.push(result.value);
    }
  }
  if (errors.length > 0) {
    // TODO shim
    throw new AggregateError(errors);
  }
  throw new ResourceNotReadyError();
}

export function waitForRace<T>(signals: (() => T)[]): T {
  const results = waitForNone<(() => T)[]>(signals);
  for (let i = 0, len = results.length; i < len; i++) {
    const result = results[i];
    if (result.type === 'success') {
      return result.value;
    }
    if (result.type === 'failure') {
      throw result.value;
    }
  }
  throw new ResourceNotReadyError();
}
