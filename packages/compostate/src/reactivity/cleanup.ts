import CleanupNode, { CLEANUP } from './nodes/cleanup';
import { Cleanup } from './types';

export default function cleanup(callback: () => void): Cleanup {
  const node = new CleanupNode();
  const popCleanup = CLEANUP.push(node);
  try {
    callback();
  } finally {
    popCleanup();
  }
  return () => {
    node.run();
  };
}
