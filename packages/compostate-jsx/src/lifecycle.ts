import { Effect } from 'compostate';
import Context from './context';

export type Lifecycle = () => void;

export const MOUNT = new Context<Lifecycle[]>();
export const UNMOUNT = new Context<Lifecycle[]>();
export const EFFECT = new Context<Effect[]>();

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
    throw new Error('Invalid onMount');
  }
}

export function onEffect(callback: Effect): void {
  const current = EFFECT.getContext();

  if (current) {
    current.push(callback);
  } else {
    throw new Error('Invalid onMount');
  }
}
