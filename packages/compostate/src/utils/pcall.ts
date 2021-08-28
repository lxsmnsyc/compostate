export interface Success<T> {
  status: 'success';
  value: T;
}

export interface Failure {
  status: 'failure';
  value: any;
}

export type Result<T> = Success<T> | Failure;

export function pcall<T, F extends any[]>(
  cb: (...arg: F) => T,
  ...args: F
): Result<T> {
  try {
    return { status: 'success', value: cb(...args) };
  } catch (error) {
    return { status: 'failure', value: error };
  }
}

export function unwrap<T>(result: Result<T>): T {
  if (result.status === 'failure') {
    throw result.value;
  }
  return result.value;
}
