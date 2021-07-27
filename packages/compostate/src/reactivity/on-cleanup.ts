import { CLEANUP } from './nodes/cleanup';
import { Cleanup } from './types';

export default function onCleanup(cleanup: Cleanup): void {
  const boundary = CLEANUP.getContext();

  if (boundary) {
    boundary.register(cleanup);
  }
}
