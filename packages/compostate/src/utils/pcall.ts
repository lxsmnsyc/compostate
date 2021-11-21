export const Success = 1;
export const Failure = 2;

export interface Success<T> {
  status: 1;
  value: T;
}

export interface Failure {
  status: 2;
  value: any;
}

export type Result<T> = Success<T> | Failure;

export function pcall0<T>(
  cb: () => T,
): Result<T> {
  try {
    return { status: Success, value: cb() };
  } catch (error) {
    return { status: Failure, value: error };
  }
}

export function pcall1<T, A>(
  cb: (a: A) => T,
  a: A,
): Result<T> {
  try {
    return { status: Success, value: cb(a) };
  } catch (error) {
    return { status: Failure, value: error };
  }
}

export function pcall2<T, A, B>(
  cb: (a: A, b: B) => T,
  a: A,
  b: B,
): Result<T> {
  try {
    return { status: Success, value: cb(a, b) };
  } catch (error) {
    return { status: Failure, value: error };
  }
}

export function pcall<T, F extends any[]>(
  cb: (...arg: F) => T,
  args: F,
): Result<T> {
  try {
    return { status: Success, value: cb(...args) };
  } catch (error) {
    return { status: Failure, value: error };
  }
}

export function unwrap<T>(result: Result<T>): T {
  if (result.status === Failure) {
    throw result.value;
  }
  return result.value;
}
