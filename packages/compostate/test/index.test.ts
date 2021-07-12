import {
  computed,
  effect,
  reactive,
  // effect,
  ref,
  untrack,
} from '../src';

describe('ref', () => {
  it('should return an object with value property with the received value', () => {
    const expected = Date.now();
    const state = ref(expected);
    expect(state.value).toBe(expected);
  });
});
describe('computed', () => {
  describe('with ref', () => {
    it('should receive value from derived ref', () => {
      const expected = Date.now();
      const state = ref(expected);
      const derived = computed(() => state.value);
      expect(derived.value).toBe(expected);
    });
    it('should recompute when tracked ref updates.', () => {
      const initial = 'Initial';
      const expected = 'Expected';
      const state = ref(initial);
      const derived = computed(() => state.value);
      state.value = expected;
      expect(derived.value).toBe(expected);
    });
  });
  describe('with reactive object', () => {
    it('should recompute when tracked object adds a key', () => {
      const initial = 'Initial';
      const state = reactive<{ value?: string }>({});
      const derived = computed(() => 'value' in state);
      state.value = initial;
      expect(derived.value).toBe(true);
    });
    it('should recompute when tracked object adds a key', () => {
      const initial = 'Initial';
      const state = reactive<{ value?: string }>({ value: initial });
      const derived = computed(() => 'value' in state);
      delete state.value;
      delete state.value;
      expect(derived.value).toBe(false);
    });
  });
  describe('with reactive array', () => {
    it('should recompute when tracked reactive array updates.', () => {
      const initial = 'Initial';
      const expected = 'Expected';
      const state = reactive([initial]);
      const derived = computed(() => state[0]);
      state[0] = expected;
      expect(derived.value).toBe(expected);
    });
  });
  describe('with reactive Map', () => {
    it('should recompute when tracked Map adds a value.', () => {
      const expected = 'Expected';
      const state = reactive(new Map());
      const derived = computed(() => state.has('value'));
      state.set('value', expected);
      expect(derived.value).toBe(true);
    });
    it('should recompute when tracked key updates.', () => {
      const initial = 'Initial';
      const expected = 'Expected';
      const state = reactive(new Map([['value', initial]]));
      const derived = computed(() => state.get('value'));
      state.set('value', expected);
      state.set('value', expected);
      expect(derived.value).toBe(expected);
    });
    it('should recompute when tracked key is deleted.', () => {
      const initial = 'Initial';
      const state = reactive(new Map([['value', initial]]));
      const derived = computed(() => state.get('value'));
      state.delete('value');
      state.delete('value');
      expect(derived.value).toBe(undefined);
    });
    it('should recompute when tracked Map clears.', () => {
      const initial = 'Initial';
      const state = reactive(new Map([['value', initial]]));
      const derived = computed(() => state.get('value'));
      state.clear();
      expect(derived.value).toBe(undefined);
    });
  });
  describe('with reactive WeakMap', () => {
    const KEY = {};
    it('should recompute when tracked adds a value.', () => {
      const expected = 'Expected';
      const state = reactive(new WeakMap());
      const derived = computed(() => state.has(KEY));
      state.set(KEY, expected);
      expect(derived.value).toBe(true);
    });
    it('should recompute when tracked key updates.', () => {
      const initial = 'Initial';
      const expected = 'Expected';
      const state = reactive(new WeakMap([[KEY, initial]]));
      const derived = computed(() => state.get(KEY));
      state.set(KEY, expected);
      state.set(KEY, expected);
      expect(derived.value).toBe(expected);
    });
    it('should recompute when tracked key is deleted.', () => {
      const initial = 'Initial';
      const state = reactive(new WeakMap([[KEY, initial]]));
      const derived = computed(() => state.get(KEY));
      state.delete(KEY);
      state.delete(KEY);
      expect(derived.value).toBe(undefined);
    });
  });
  describe('with reactive Set', () => {
    it('should recompute when tracked adds a value.', () => {
      const expected = 'Expected';
      const state = reactive(new Set());
      const derived = computed(() => state.has(expected));
      state.add(expected);
      expect(derived.value).toBe(true);
    });
    it('should recompute when tracked key is deleted.', () => {
      const initial = 'Initial';
      const state = reactive(new Set([initial]));
      const derived = computed(() => state.has(initial));
      state.delete(initial);
      state.delete(initial);
      expect(derived.value).toBe(false);
    });
    it('should recompute when tracked Set clears.', () => {
      const initial = 'Initial';
      const state = reactive(new Set([initial]));
      const derived = computed(() => state.has(initial));
      state.clear();
      expect(derived.value).toBe(false);
    });
  });
  describe('with reactive WeakSet', () => {
    const KEY = {};
    it('should recompute when tracked adds a value.', () => {
      const state = reactive(new WeakSet());
      const derived = computed(() => state.has(KEY));
      state.add(KEY);
      expect(derived.value).toBe(true);
    });
    it('should recompute when tracked key is deleted.', () => {
      const state = reactive(new WeakSet([KEY]));
      const derived = computed(() => state.has(KEY));
      state.delete(KEY);
      state.delete(KEY);
      expect(derived.value).toBe(false);
    });
  });
});
describe('effect', () => {
  it('should re-evalutate when tracked ref updates.', () => {
    const initial = 'Initial';
    const expected = 'Expected';
    const state = ref(initial);
    let updated = state.value;
    effect(() => {
      updated = state.value;
    });
    state.value = expected;
    expect(updated).toBe(expected);
  });
  it('should perform cleanup when tracked ref updates.', () => {
    const initial = 'Initial';
    const expected = 'Expected';
    const state = ref(initial);
    let updated = state.value;
    let cleaned = false;
    effect(() => {
      updated = state.value;
      return () => {
        cleaned = true;
      };
    });
    state.value = expected;
    expect(updated).toBe(expected);
    expect(cleaned).toBe(true);
  });
  it('should stop tracking when stop is called.', () => {
    const count = ref(0);
    let derived = count.value;
    const stop = effect(() => {
      derived = count.value;
    });
    count.value += 1;
    stop();
    count.value += 1;
    expect(derived).toBe(1);
  });
  it('should perform cleanup when stop is called.', () => {
    let cleaned = false;
    const stop = effect(() => () => {
      cleaned = true;
    });
    stop();
    expect(cleaned).toBe(true);
  });
});
describe('untrack', () => {
  describe('computed', () => {
    it('should not track wrapped ref', () => {
      const expected = 'Expected';
      const update = 'Update';
      const state = ref(expected);
      const derived = computed(() => untrack(() => state.value));
      state.value = update;
      expect(derived.value).toBe(expected);
    });
  });
  describe('effect', () => {
    it('should not track wrapped ref', () => {
      const expected = 'Expected';
      const update = 'Update';
      const state = ref(expected);
      const rawDerived = ref(state.value);
      effect(() => {
        rawDerived.value = untrack(() => state.value);
      });
      state.value = update;
      expect(rawDerived.value).toBe(expected);
    });
    it('should not cleanup untracked child effect', () => {
      let cleaned = false;
      const stop = effect(() => {
        effect(() => {
          untrack(() => effect(() => () => {
            cleaned = true;
          }));
        });
      });
      stop();
      expect(cleaned).toBe(false);
    });
  });
});
describe('batch', () => {

});
