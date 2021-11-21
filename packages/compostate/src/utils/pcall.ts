export interface Success<T> {
  isSuccess: true;
  value: T;
}

export interface Failure {
  isSuccess: false;
  value: any;
}

export type Result<T> = Success<T> | Failure;

export function pcall0<T>(
  cb: () => T,
): Result<T> {
  try {
    return { isSuccess: true, value: cb() };
  } catch (error) {
    return { isSuccess: false, value: error };
  }
}

export function pcall1<T, A>(
  cb: (a: A) => T,
  a: A,
): Result<T> {
  try {
    return { isSuccess: true, value: cb(a) };
  } catch (error) {
    return { isSuccess: false, value: error };
  }
}

export function pcall2<T, A, B>(
  cb: (a: A, b: B) => T,
  a: A,
  b: B,
): Result<T> {
  try {
    return { isSuccess: true, value: cb(a, b) };
  } catch (error) {
    return { isSuccess: false, value: error };
  }
}

export function pcall<T, F extends any[]>(
  cb: (...arg: F) => T,
  args: F,
): Result<T> {
  try {
    return { isSuccess: true, value: cb(...args) };
  } catch (error) {
    return { isSuccess: false, value: error };
  }
}

export function unwrap<T>(result: Result<T>): T {
  if (result.isSuccess) {
    return result.value;
  }
  throw result.value;
}
