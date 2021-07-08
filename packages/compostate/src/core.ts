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

const GLOBAL_INSTANCE_MAP = new Map<string, Instance<any>>();

// For tracking updates
const TRACKING = new Context<TrackingContext<any>>();

// For batching/merging updates
const UPDATE = new Context<Links>();

const ISOLATE = new Context<boolean>();

interface TrackingContext<T> {
  // The parent reference
  parent: State<T>;
  // The list of references tracking this reference
  dependencies: Links;
  // The references created within this context
  children: Links;
  // The instances map for the children references
  map: InstanceMap;
}

export class State<T> {
  readonly key: string;

  readonly kind: StateKind;

  readonly computation: StateComputation<T>;

  readonly cleanup?: StateCleanup<T>;

  private context?: TrackingContext<any>;

  constructor(
    prefix: StateKind,
    {
      key, value, cleanup,
    }: StateOptions<T>,
  ) {
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
    const popTracking = TRACKING.push({
      parent: this,
      dependencies,
      children,
      map,
    });
    const popIsolation = ISOLATE.push(false);
    const value = this.computation();
    popIsolation();
    popTracking();

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
    // We destroy any references that are created in this reference
    // This is to make sure that effects and states are properly cleaned up.
    new Set(children).forEach((child) => {
      child.destroy(true);
    });
  }

  private track(instance: Instance<T>): void {
    const context = TRACKING.getContext();
    if (context && context.parent !== this) {
      instance.dependents.add(context.parent);
      context.dependencies.add(this);
    }
  }

  watch(): void {
    const shouldIsolate = ISOLATE.getContext();
    if (!shouldIsolate) {
      this.track(this.getInstance());
    }
  }

  private writeable = false;

  get value(): T {
    const instance = this.getInstance();
    // Track the instance
    this.watch();
    return instance.value;
  }

  set value(value: T) {
    // readonly states are not allowed to have
    // their state get modified.
    if (this.kind === 'readonly' && !this.writeable) {
      throw new Error('Attempt to update a readonly state.');
    }
    const instance = this.getInstance();

    // Cleanup previous value.
    this.cleanup?.(instance.value);

    // Assign new value
    instance.value = value;

    // Notify all dependent references of the change
    new Set(instance.dependents).forEach((dependent) => {
      // If there's a parent batch updates and
      // the reference isn't isolated, we move this
      // update call to the batcher
      const batchingUpdates = UPDATE.getContext();
      const shouldIsolate = ISOLATE.getContext();
      if (batchingUpdates && !shouldIsolate) {
        batchingUpdates.add(dependent);
      } else {
        dependent.reset();
      }
    });
  }

  reset(): void {
    const instance = this.getRawInstance();

    if (instance) {
      this.detach(instance.dependencies, instance.children);

      const dependencies: Links = new Set();
      const children: Links = new Set();
      const map: InstanceMap = new Map();

      // We re-enable writeable so that readonly
      // states are able to recompute.
      // eslint-disable-next-line no-param-reassign
      this.writeable = true;
      this.value = this.compute(dependencies, children, map);
      this.writeable = false;

      instance.dependencies = dependencies;
      instance.children = children;
    } else {
      this.getInstance();
    }
  }

  destroy(cascade = false): void {
    const instance = this.getRawInstance();

    if (instance) {
      // In cascade, we destroy not only this reference
      // but also the dependent references.
      if (cascade) {
        this.cleanup?.(instance.value);

        this.detach(instance.dependencies, instance.children);

        new Set(instance.dependents).forEach((dependent) => {
          dependent.destroy(true);
        });

        this.getMap().delete(this.key);
      // Otherwise, we destroy this reference
      // only if there are no dependent references.
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
  // Create state instance
  const reference: State<T> = new State(prefix, options);

  // If the reference isn't isolated, and there's a tracking reference
  // we link this reference to the tracking reference.
  const context = TRACKING.getContext();
  const shouldIsolate = ISOLATE.getContext();
  if (context && !shouldIsolate) {
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

export function batchUpdates(callback: () => void): void {
  const pop = UPDATE.push(new Set());
  callback();
  new Set(pop()).forEach((update) => {
    update.reset();
  });
}

export function isolate<T>(callback: () => T): T {
  const pop = ISOLATE.push(true);
  const result = callback();
  pop();
  return result;
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
