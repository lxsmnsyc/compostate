import CleanupNode, { CLEANUP } from './nodes/cleanup';
import { Cleanup } from './types';

export default function batchCleanup(callback: () => void | undefined | Cleanup): Cleanup {
  const node = new CleanupNode(CLEANUP.current());
  CLEANUP.push(node);
  try {
    const cleanup = callback();
    if (cleanup) {
      node.register(cleanup);
    }
  } finally {
    CLEANUP.pop();
  }
  return () => {
    node.run();
  };
}
