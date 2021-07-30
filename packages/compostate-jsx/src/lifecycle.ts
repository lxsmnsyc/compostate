import Context from './context';
import { ErrorCapture } from './error-boundary';

export type Lifecycle = () => void;

export const MOUNT = new Context<Lifecycle[]>();
export const UNMOUNT = new Context<Lifecycle[]>();
export const ERROR = new Context<ErrorCapture[]>();

export function onMount(callback: () => void): void {
  const current = MOUNT.current();

  if (current) {
    current.push(callback);
  } else {
    throw new Error('Invalid onMount');
  }
}

export function onUnmount(callback: () => void): void {
  const current = UNMOUNT.current();

  if (current) {
    current.push(callback);
  } else {
    throw new Error('Invalid onUnmount');
  }
}

export function onError(callback: ErrorCapture): void {
  const current = ERROR.current();

  if (current) {
    current.push(callback);
  } else {
    throw new Error('Invalid onError');
  }
}
