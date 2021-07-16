import Context from './context';
import { ErrorCapture } from './error-boundary';

export type Lifecycle = () => void;

export const MOUNT = new Context<Lifecycle[]>();
export const UNMOUNT = new Context<Lifecycle[]>();
export const ERROR = new Context<ErrorCapture[]>();

export function onMount(callback: () => void): void {
  const current = MOUNT.getContext();

  if (current) {
    current.push(callback);
  } else {
    throw new Error('Invalid onMount');
  }
}

export function onUnmount(callback: () => void): void {
  const current = UNMOUNT.getContext();

  if (current) {
    current.push(callback);
  } else {
    throw new Error('Invalid onUnmount');
  }
}

export function onError(callback: ErrorCapture): void {
  const current = ERROR.getContext();

  if (current) {
    current.push(callback);
  } else {
    throw new Error('Invalid onError');
  }
}
