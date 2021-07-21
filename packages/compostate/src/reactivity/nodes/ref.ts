import ReactiveAtom from './reactive-atom';
import { registerTrackable } from './track-map';

export default class RefNode<T> {
  private val: T;

  private atom = new ReactiveAtom();

  constructor(val: T) {
    this.val = val;

    registerTrackable(this.atom, this);
  }

  get value(): T {
    this.atom.track();
    return this.val;
  }

  set value(val: T) {
    if (!Object.is(val, this.val)) {
      this.val = val;
      this.atom.notify();
    }
  }
}
