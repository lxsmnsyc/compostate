import Context from '../../context';
import { Cleanup } from '../types';
import untrack from '../untrack';

export const CLEANUP = new Context<CleanupNode | undefined>();

export default class CleanupNode {
  private calls?: Set<Cleanup>;

  register(cleanup: Cleanup): Cleanup {
    if (!this.calls) {
      this.calls = new Set();
    }
    this.calls.add(cleanup);
    return () => {
      this.calls?.delete(cleanup);
    };
  }

  run(): void {
    untrack(() => {
      new Set(this.calls).forEach((cleanup) => {
        cleanup();
      });
    });
  }
}
