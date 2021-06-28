# compostate

> Composable and reactive state management library

[![NPM](https://img.shields.io/npm/v/compostate.svg)](https://www.npmjs.com/package/compostate) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --save compostate
```

```bash
yarn add compostate
```

## Usage

```tsx
import { state, effect } from 'compostate';

// Create our state
const counter = state(() => 0);

// Subscribe to state changes
effect(() => {
  console.log(counter.value);
});

counter.value += 10; // logs 10

// Derive state from other state
const derived = state(() => counter.value * 2);

// Subscribe to derived state
effect(() => {
  console.log('Derived:', derived.value);
});

// Update parent state
counter.value += 10 // logs 20 then "Derived: 40"

// Subscribe to both states
effect(() => {
  console.log('Original:', counter.value);
  console.log('Derived:', derived.value)
});
```

## Features

### Reactivity

`compostate` core is only composed of two functions: `state` and `effect`. `state` provides a way to create reactive reference, while `effect` provides a way to create side-effects that reacts to the updates of any given `state`.

#### `state`

`state` provides a way to create reactive references.

```ts
import { state } from 'compostate';

const message = state(() => 'Hello World');
```

The reference has a property called `value` which you can get and set the state from.

```ts
message.value = 'Hello John Doe';
```

Changes to the state will notify the `effect` and other derived `state` to re-evaluate.

#### Derived `state`

Sometimes, we want a way to transform states before receiving them. Aside from being a lazy constructor, `state` allows derivation that allows the reference to track other references and re-evaluate whenever the tracked references update.

```ts
const name = state(() => 'John Doe');

// A derived state
const message = state(() => `Hello, ${name.value}`); // Hello, John Doe

// Update tracked state
name.value = 'Jane Doe'; // message updates to `Hello, Jane Doe`.
```

#### `readonly`

Using the `readonly` function, we can wrap a `state` reference and enforce a read-only mode:

```ts
import { readonly } from 'compostate';

const readonlyName = readonly(name);

readonlyName.value = 'New Name'; // Error!
```

#### `effect`

`effect` allows creation of side-effects that can track `state` references and re-evaluate whenever the tracked `state` changes. This is the best place to perform side-effects such as state mutation and event listeners.

```ts
const count = state(() => 0);

effect(() => {
  console.log(`Count: ${count.value}`); // Count: 0
});

count.value = 1; // Count: 1
count.value = 10; // Count: 10
count.value *= 10; // Count: 100
```

The callback passed inside `effect` may return a function that is invoked before re-evaluation. This is ideal for side-effect cleanups (e.g. aborting requests, removing event listeners, etc.)

```ts
// An example of debounce
// The timeout is cleared every time the duration changes.
effect(() => {
  const timeout = setTimeout(() => {
    console.log('Expired!');
  }, duration.value);

  return () => {
    clearTimeout(timeout);
  };
});
```

`effect` can also be controlled in case we want to stop tracking. When stopped and if the `effect` received a cleanup function, the cleanup is performed.

```ts
const stop = effect(() => {
  // ...
});

stop();
```

### Ownership

The callbacks of `state` and `effect` are never constrained to not have any other calls to `state` and `effect` as well.

```ts
effect(() => {
  effect(() => {
    // ...
  })
});
```

To prevent potential memory leaks, `compostate` employs an ownership model for cleaning up both `state` and `effect` calls. If a `state` or an `effect` was called in another, the lifecycle of those are managed by the parent `state` or `effect`, so if the parent re-evaluates, the nested `state` and `effect` are cleaned-up automatically.

```ts
const stop = effect(() => {
  const currentMessage = message.value;

  // If the parent re-evaluates or is stopped, the child effect
  // is also cleaned up.
  effect(() => {
    const timeout = setTimeout(() => {
      console.log(currentMessage);
    }, duration.value);

    return () => {
      clearTimeout(timeout);
    };
  });
});
```

#### State Cleanup

To add cleanups to `state`, you can provide an object instead of a function to the `state` that contains a `value` and a `cleanup` method. The `value` provides the `state` its value while `cleanup` receives the previous value and performs the user-defined cleanup. The `cleanup` runs on parent cleanup and whenever the `value` is re-evaluated.

```ts
const timeout = state({
  value() {
    return setTimeout(() => {
      console.log('Subscribed!');
    }, duration);
  },
  cleanup(timeout) {
    clearTimeout(timeout);
  },
});
```

### Batching

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
