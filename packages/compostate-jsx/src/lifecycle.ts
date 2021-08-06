import Context from './context';

export type Lifecycle = () => void;

export const MOUNT = new Context<Lifecycle[]>();
export const UNMOUNT = new Context<Lifecycle[]>();

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
