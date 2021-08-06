import { Cleanup } from '../types';

export let CLEANUP: Set<Cleanup> | undefined;

export function setCleanup(cleanups: Set<Cleanup> | undefined): void {
  CLEANUP = cleanups;
}
