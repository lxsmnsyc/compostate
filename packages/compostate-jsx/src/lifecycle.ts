export type Lifecycle = () => void;

export let MOUNT: Lifecycle[];
export let UNMOUNT: Lifecycle[];

export function setMount(instance: Lifecycle[]): void {
  MOUNT = instance;
}

export function setUnmount(instance: Lifecycle[]): void {
  UNMOUNT = instance;
}

export function onMount(callback: () => void): void {
  if (MOUNT) {
    MOUNT.push(callback);
  } else {
    throw new Error('Invalid onMount');
  }
}

export function onUnmount(callback: () => void): void {
  if (MOUNT) {
    MOUNT.push(callback);
  } else {
    throw new Error('Invalid onUnmount');
  }
}
