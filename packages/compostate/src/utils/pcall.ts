export type Success<T> = [true, T];

export type Failure = [false, any];

export type Result<T> = Success<T> | Failure;

export function pcall0<T>(
  cb: () => T,
): Result<T> {
  try {
    return [true, cb()];
  } catch (error) {
    return [false, error];
  }
}

export function pcall1<T, A>(
  cb: (a: A) => T,
  a: A,
): Result<T> {
  try {
    return [true, cb(a)];
  } catch (error) {
    return [false, error];
  }
}

export function pcall2<T, A, B>(
  cb: (a: A, b: B) => T,
  a: A,
  b: B,
): Result<T> {
  try {
    return [true, cb(a, b)];
  } catch (error) {
    return [false, error];
  }
}

export function pcall<T, F extends any[]>(
  cb: (...arg: F) => T,
  args: F,
): Result<T> {
  try {
    return [true, cb(...args)];
  } catch (error) {
    return [false, error];
  }
}

export function unwrap<T>([isSuccess, value]: Result<T>): T {
  if (isSuccess) {
    return value;
  }
  throw value;
}
