/**
 * @license
 * MIT License
 *
 * Copyright (c) 2021 Alexis Munsayac
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 *
 * @author Alexis Munsayac <alexis.munsayac@gmail.com>
 * @copyright Alexis Munsayac 2021
 */

import Context from './Context';
import getKey from './getKey';
import {
  StateComputation,
  StateCleanup,
  StateOptions,
  Effect,
  EffectUnsubscribe,
  StateKind,
} from './types';

type Links = Set<State<any>>;

interface Instance<T> {
  reference: State<T>;
  value: T;
  dependents: Links;
  dependencies: Links;
  children: Links;
}

type InstanceMap = Map<string, Instance<any>>;

export class BatchedEffects {
  private effects = new Set<() => void>();

  private pending = true;

  private listeners = new Set<() => void>();

  add(reference: () => void): void {
    if (!this.pending) {
      this.pending = true;
      new Set(this.listeners).forEach((listener) => {
        listener();
      });
    }
    this.effects.add(reference);
  }

  flush(): void {
    new Set(this.effects).forEach((effect) => {
      effect();
    });
    this.effects.clear();
    this.pending = false;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

const GLOBAL_INSTANCE_MAP = new Map<string, Instance<any>>();

const TRACKING = new Context<TrackingContext<any>>();
const UPDATE = new Context<Links>();
const EFFECT = new Context<BatchedEffects>();

interface TrackingContext<T> {
  parent: State<T>;
  dependencies: Links;
  children: Links;
  map: InstanceMap;
  effect?: BatchedEffects;
}

export class State<T> {
  readonly key: string;

  readonly kind: StateKind;

  readonly computation: StateComputation<T>;

  readonly cleanup?: StateCleanup<T>;

  private context?: TrackingContext<any>;

  constructor(prefix: StateKind, { key, value, cleanup }: StateOptions<T>) {
    this.kind = prefix;
    this.key = getKey(prefix, key);
    this.computation = value;
    this.cleanup = cleanup;
    this.context = TRACKING.getContext();
  }

  private getMap(): InstanceMap {
    return this.context?.map ?? GLOBAL_INSTANCE_MAP;
  }

  private compute(
    dependencies: Links,
    children: Links,
    map: InstanceMap,
  ): T {
    const effect = EFFECT.getContext();
    const pop = TRACKING.push({
      parent: this,
      dependencies,
      children,
      map,
      effect,
    });
    const value = this.computation();
    pop();

    return value;
  }

  private getRawInstance(): Instance<T> | undefined {
    const instance = this.getMap().get(this.key);
    if (instance) {
      return instance;
    }
    return undefined;
  }

  private getInstance(): Instance<T> {
    const current = this.getRawInstance();

    if (current) {
      return current;
    }

    const dependencies: Links = new Set();
    const children: Links = new Set();
    const map: InstanceMap = new Map();

    const newInstance: Instance<T> = {
      reference: this,
      value: this.compute(dependencies, children, map),
      dependents: new Set(),
      dependencies,
      children,
    };

    this.getMap().set(this.key, newInstance);

    return newInstance;
  }

  private detach(dependencies: Links, children: Links): void {
    new Set(dependencies).forEach((dependency) => {
      const instance = dependency.getRawInstance();
      if (instance) {
        instance.dependents.delete(this);
      }
    });
    new Set(children).forEach((child) => {
      child.destroy(true);
    });
  }

  private batchEffectInternal(action: () => void) {
    if (this.kind === 'effect') {
      const currentBatcher = this.context?.effect;

      if (currentBatcher) {
        currentBatcher.add(action);
        return;
      }
    }
    action();
  }

  private track(instance: Instance<T>): void {
    const context = TRACKING.getContext();
    if (context && context.parent !== this) {
      instance.dependents.add(context.parent);
      context.dependencies.add(this);
    }
  }

  watch(): void {
    this.track(this.getInstance());
  }

  private writeable = false;

  get value(): T {
    const instance = this.getInstance();
    this.watch();
    return instance.value;
  }

  set value(value: T) {
    if (this.kind === 'readonly' && !this.writeable) {
      throw new Error('Attempt to update a readonly state.');
    }
    const instance = this.getInstance();

    this.cleanup?.(instance.value);

    instance.value = value;

    new Set(instance.dependents).forEach((dependent) => {
      // Move pending effect to batching updates
      const batchingUpdates = UPDATE.getContext();
      if (batchingUpdates) {
        batchingUpdates.add(dependent);
      } else {
        dependent.reset();
      }
    });
  }

  reset(): void {
    this.batchEffectInternal(() => {
      const instance = this.getRawInstance();

      if (instance) {
        this.detach(instance.dependencies, instance.children);

        const dependencies: Links = new Set();
        const children: Links = new Set();
        const map: InstanceMap = new Map();

        // eslint-disable-next-line no-param-reassign
        this.writeable = true;
        this.value = this.compute(dependencies, children, map);
        this.writeable = false;

        instance.dependencies = dependencies;
        instance.children = children;
      } else {
        this.getInstance();
      }
    });
  }

  destroy(cascade = false): void {
    const instance = this.getRawInstance();

    if (instance) {
      if (cascade) {
        this.cleanup?.(instance.value);

        this.detach(instance.dependencies, instance.children);

        new Set(instance.dependents).forEach((dependent) => {
          dependent.destroy(true);
        });

        this.getMap().delete(this.key);
      } else if (instance.dependents.size === 0) {
        this.cleanup?.(instance.value);
        this.detach(instance.dependencies, instance.children);
        this.getMap().delete(this.key);
      } else {
        throw new Error('Attempt to destroy a state with existing dependent states.');
      }
    }
  }
}

function ref<T>(prefix: StateKind, options: StateOptions<T>): State<T> {
  const reference: State<T> = new State(prefix, options);
  const context = TRACKING.getContext();
  if (context) {
    context.children.add(reference);
  }
  return reference;
}

/**
 * Create a reactive state
 */
export function state<T>(value: StateComputation<T>, cleanup?: StateCleanup<T>): State<T>;
export function state<T>(options: StateOptions<T>): State<T>;
export function state<T>(
  options: StateOptions<T> | StateComputation<T>,
  cleanup?: StateCleanup<T>,
): State<T> {
  return ref('state', (
    typeof options === 'function'
      ? {
        key: options.name,
        value: options,
        cleanup,
      }
      : options
  ));
}

export function batchEffects(callback: () => void): BatchedEffects {
  const pop = EFFECT.push(new BatchedEffects());
  callback();
  return pop();
}

export function batchUpdates(callback: () => void): void {
  const pop = UPDATE.push(new Set());
  callback();
  new Set(pop()).forEach((update) => {
    update.reset();
  });
}

/**
 * Create reactive side-effects.
 */
export function effect(setup: Effect['setup']): EffectUnsubscribe;
/**
 * Create reactive side-effects.
 */
export function effect(options: Effect): EffectUnsubscribe;
export function effect(options: Effect | Effect['setup']): EffectUnsubscribe {
  const config: Effect = typeof options === 'function'
    ? {
      key: options.name,
      setup: options,
    }
    : options;

  const reference = ref('effect', {
    key: config.key,
    value: config.setup,
    cleanup: (currentCleanup) => {
      if (currentCleanup) {
        currentCleanup();
      }
    },
  });

  reference.reset();

  return () => {
    reference.destroy();
  };
}

export function readonly<T>(reference: State<T>): State<T> {
  return ref('readonly', {
    value() {
      return reference.value;
    },
  });
}
