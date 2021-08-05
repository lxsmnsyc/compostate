import { CLEANUP, runCleanups, setCleanup } from './nodes/cleanup';
import onCleanup from './on-cleanup';
import { Cleanup } from './types';

export default function batchCleanup(callback: () => void | undefined | Cleanup): Cleanup {
  const cleanups = new Set<Cleanup>();
  const parentCleanup = CLEANUP;
  setCleanup(cleanups);
  try {
    const cleanup = callback();
    // Add the returned cleanup as well
    if (cleanup) {
      cleanups.add(cleanup);
    }
  } finally {
    setCleanup(parentCleanup);
  }
  // Create return cleanup
  const returnCleanup = () => {
    runCleanups(cleanups);
  };
  onCleanup(returnCleanup);
  return returnCleanup;
}
