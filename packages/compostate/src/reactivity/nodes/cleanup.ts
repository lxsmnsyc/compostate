import Context from '../../context';
import { Cleanup } from '../types';

export const CLEANUP = new Context<CleanupNode | undefined>();

export default class CleanupNode {
  private calls?: Set<Cleanup>;

  constructor(parent?: CleanupNode) {
    parent?.register(() => {
      this.run();
    });
  }

  register(cleanup: Cleanup): void {
    if (!this.calls) {
      this.calls = new Set();
    }
    this.calls.add(cleanup);
  }

  run(): void {
    this.calls?.forEach((cleanup) => {
      cleanup();
    });
  }
}
