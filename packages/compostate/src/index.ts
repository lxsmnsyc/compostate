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

export type StateComputation<T> = () => T;
export type StateCleanup<T> = (value: T) => void;

export type StateListener<T> = (value: T, prevValue: T) => void;
export type StateUnsubscribe = () => void;
export type StateEffectCleanup = undefined | void | StateUnsubscribe;

export interface StateEffect {
  readonly key?: string;
  readonly setup: () => StateEffectCleanup;
}

type InstanceMap = Map<string, Instance<any>>;

export interface StateOptions<T> {
  readonly key?: string;
  readonly value: StateComputation<T>;
  readonly cleanup?: StateCleanup<T>;
}

type Links = Set<State<any>>;

interface Instance<T> {
  reference: State<T>;
  value: T;
  dependents: Links;
  dependencies: Links;
  children: Links;
}

let index = 0;

function createKey(prefix: string): string {
  const count = index;
  index += 1;
  return `${prefix}-${count}`;
}

const KEYS = new Map<string, string>();

function getKey(prefix: string, key?: string): string {
  // Check if there's a key
  if (key) {
    if (process.env.NODE_ENV === 'production') {
      // If the key already exists, return the
      // memoized key
      const current = KEYS.get(key);
      if (current) {
        return current;
      }
      const newKey = createKey(prefix);
      KEYS.set(key, newKey);
      return newKey;
    }
    return key;
  }

  return createKey(prefix);
}

interface Context<T> {
  parent: State<T>;
  dependencies: Links;
  children: Links;
  map: InstanceMap;
}

let context: Context<any> | undefined;

function compute<T>(
  reference: State<T>,
  dependencies: Links,
  children: Links,
  map: InstanceMap,
): T {
  const parent = context;
  context = {
    parent: reference,
    dependencies,
    children,
    map,
  };
  const value = reference.computation();
  context = parent;

  return value;
}

const INSTANCES = new Map<string, Instance<any>>();

function getRawInstance<T>(reference: State<T>): Instance<T> | undefined {
  const instance = reference.map.get(reference.key);
  if (instance) {
    return instance;
  }
  return undefined;
}

function getInstance<T>(reference: State<T>): Instance<T> {
  const current = getRawInstance<T>(reference);

  if (current) {
    return current;
  }

  const dependencies: Links = new Set();
  const children: Links = new Set();
  const map: InstanceMap = new Map();

  const newInstance: Instance<T> = {
    reference,
    value: compute(reference, dependencies, children, map),
    dependents: new Set(),
    dependencies,
    children,
  };

  reference.map.set(reference.key, newInstance);

  return newInstance;
}

export interface State<T> {
  readonly key: string;

  readonly map: InstanceMap;

  readonly kind: 'state' | 'effect';

  readonly computation: StateComputation<T>;

  readonly cleanup?: StateCleanup<T>;

  value: T;
}

class StateCore<T> implements State<T> {
  readonly key: string;

  readonly map: InstanceMap;

  readonly kind: 'state' | 'effect';

  readonly computation: StateComputation<T>;

  readonly cleanup?: StateCleanup<T>;

  constructor(prefix: 'state' | 'effect', { key, value, cleanup }: StateOptions<T>) {
    this.kind = prefix;
    this.key = getKey(prefix, key);
    this.computation = value;
    this.cleanup = cleanup;
    this.map = context ? context.map : INSTANCES;
  }

  get value() {
    return get(this);
  }

  set value(value: T) {
    set(this, value);
  }
}

export function isState<T>(state: any): state is State<T> {
  return state instanceof StateCore;
}

function ref<T>(prefix: 'state' | 'effect', options: StateOptions<T>): State<T> {
  const reference: State<T> = new StateCore(prefix, options);
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

function detach<T>(reference: State<T>, dependencies: Links, children: Links): void {
  new Set(dependencies).forEach((dependency) => {
    const instance = getRawInstance(dependency);
    if (instance) {
      instance.dependents.delete(reference);
    }
  });
  new Set(children).forEach((child) => {
    destroy(child, true);
  });
}

/**
 * Reset a state
 */
export function reset<T>(reference: State<T>): void {
  const instance = getInstance(reference);

  detach(reference, instance.dependencies, instance.children);

  const dependencies: Links = new Set();
  const children: Links = new Set();
  const map: InstanceMap = new Map();

  set(reference, compute(reference, dependencies, children, map));

  instance.dependencies = dependencies;
  instance.children = children;
}

/**
 * Destroy a state
 */
export function destroy<T>(reference: State<T>, cascade = false): void {
  const instance = getRawInstance(reference);

  if (instance) {
    if (cascade) {
      reference.cleanup?.(instance.value);

      detach(reference, instance.dependencies, instance.children);

      instance.dependents.forEach((dependent) => {
        destroy(dependent, true);
      });

      reference.map.delete(reference.key);
    } else if (instance.dependents.size === 0) {
      reference.cleanup?.(instance.value);

      detach(reference, instance.dependencies, instance.children);

      reference.map.delete(reference.key);
    } else {
      throw new Error('Attempt to destroy a state with existing dependent states.');
    }
  }
}

/**
 * Get the current state
 */
export function get<T>(reference: State<T>): T {
  const instance = getInstance(reference);
  if (context && context.parent !== reference) {
    instance.dependents.add(context.parent);
    context.dependencies.add(reference);
  }
  return instance.value;
}

/**
 * Set the new state
 */
export function set<T>(reference: State<T>, value: T): void {
  const instance = getInstance(reference);

  reference.cleanup?.(instance.value);

  instance.value = value;

  new Set(instance.dependents).forEach((dependent) => {
    reset(dependent);
  });
}

export function init<T>(reference: State<T>): void {
  getInstance(reference);
}

/**
 * Create reactive side-effects.
 */
export function effect(setup: StateEffect['setup']): StateUnsubscribe;
/**
 * Create reactive side-effects.
 */
export function effect(options: StateEffect): StateUnsubscribe;
export function effect(options: StateEffect | StateEffect['setup']): StateUnsubscribe {
  const config: StateEffect = typeof options === 'function'
    ? {
      key: options.name,
      setup: options,
    }
    : options;

  const reference = ref('effect', {
    key: config.key,
    value: config.setup,
    cleanup: (value) => {
      if (value) {
        value();
      }
    },
  });

  init(reference);

  return () => {
    destroy(reference, true);
  };
}
