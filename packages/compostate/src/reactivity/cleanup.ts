import CleanupNode, { CLEANUP } from './nodes/cleanup';
import { Cleanup } from './types';

export default function cleanup(callback: () => void): Cleanup {
  const node = new CleanupNode();
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
