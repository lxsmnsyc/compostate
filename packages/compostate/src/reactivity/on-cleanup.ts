import { CLEANUP } from './nodes/cleanup';
import { Cleanup } from './types';

export default function onCleanup(cleanup: Cleanup): void {
  CLEANUP?.add(cleanup);
}
