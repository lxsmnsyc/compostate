import CleanupNode, { CLEANUP } from './nodes/cleanup';
import { Cleanup } from './types';

export default function batchCleanup(callback: () => void): Cleanup {
  const node = new CleanupNode(CLEANUP.current());
  CLEANUP.push(node);
  try {
    callback();
  } finally {
    CLEANUP.pop();
  }
  return () => {
    node.run();
  };
}
