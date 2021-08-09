import {
  createReactiveAtom,
  notifyReactiveAtom,
  registerTrackable,
  trackReactiveAtom,
} from '../core';

export default class RefNode<T> {
  private val: T;

  private atom = createReactiveAtom();

  constructor(val: T) {
    this.val = val;

    registerTrackable(this.atom, this);
  }

  get value(): T {
    trackReactiveAtom(this.atom);
    return this.val;
  }

  set value(val: T) {
    if (!Object.is(val, this.val)) {
      this.val = val;
      notifyReactiveAtom(this.atom);
    }
  }
}
