# compostate

> Fine-grained reactivity library

[![NPM](https://img.shields.io/npm/v/compostate.svg)](https://www.npmjs.com/package/compostate) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --save compostate
```

```bash
yarn add compostate
```

```bash
pnpm add compostate
```

## Concepts

### Signals and Atoms

Signals and atoms are the main source of reactivity in `compostate`. They are akin to "subjects" or "observables" in the [Observer pattern](https://en.wikipedia.org/wiki/Observer_pattern). Signals and atoms holds values that can either be read or written.

```js
import { signal, atom } from 'compostate';

// with signals
const [count, setCount] = signal(0);
// reading a signal
console.log('Count', count());
// writing to a signal
setCount(count() + 100);

// with atoms
const count = atom(0);
// reading an atom
console.log('Count', count());
// writing to an atom
count(count() + 100);
```

### Effects

Effects are the "observers" of `compostate`. When reading a signal or an atom inside effects, effects will automatically mark those as "dependencies", in which when these dependencies update values, effects will automatically re-evaluate.

```js
import { signal, syncEffect } from 'compostate';

// Create a signal
const [count, setCount] = signal(0);

// Observe the signal
syncEffect(() => {
  console.log('Count:', count()); // Logs 'Count: 0'
});

// Update the count
setCount(100); // Logs 'Count: 0' due to the effect
```

When effects re-evaluate, it reconstructs the tracked dependencies from scratch, and so conditional dependency can also be done.

```js
syncEffect(() => {
  if (someCond()) {
    // Subscribe to signalA: this effect will only evaluate
    // if signalA changes
    doSomething(signalA());
  } else {
    // Subscribe to signalB: this effect will only evaluate
    // if signalB changes
    doOthers(signalB());
  }
});
```

One can also use `untrack` to prevent an effect from marking a signal as a dependency

```js
import { untrack } from 'compostate';

syncEffect(() => {
  // This effect will access `someSignal` w/o subscribing
  const somePassiveSignal = untrack(() => someSignal());
});
```

`syncEffect` runs synchronously with signal updates, but this might be undesirable in some cases. An alternative is `effect` which has its evaluation deferred through time-slicing.

```js
import { effect, atom } from 'compostate';

const greeting = atom('Hello');
const receiver = atom('Alexis');

effect(() => {
  // Since the evaluation is deferred, this effect will only 
  // log after the synchronous code ends.
  console.log(`${greeting()}, ${receiver()}!`);
});

greeting('Bonjour');
receiver('Compostate');

// At the end of this code, this logs 'Bonjour, Compostate!'
setTimeout(() => {
  // The effect is now tracking greeting and receiver
  // however like the code above, changes to the atoms
  // would not synchronously re-evaluate the effect.
  greeting('Hello');
  receiver('Alexis');
  // At the end of this callback, it logs 'Hello, Alexis!'
}, 1000);
```

### Deriving signals

Signals and atoms can be composed into derived signals. The basic form of a derived signal uses nothing but a simple function.

```js
const count = atom(0);
const squared = () => count() ** 2;

syncEffect(() => {
  console.log(squared()); // 0
});

count(4); // 16
```

Normally this is useful but there arises a problem: a derived signal may return the same value but would still trigger a re-evaluation.

```js
const message = atom('Hello');
const length = () => message().length;


syncEffect(() => {
  console.log('Length:', length()); // Length: 5
});

message('Aloha') // Logs again with Length: 5
```

To fix this problem, `computed` can be used in place of the derived signal.

```js
import { computed } from 'compostate';

const message = atom('Hello');
const length = computed(() => message().length);


syncEffect(() => {
  console.log('Length:', length()); // Length: 5
});

message('Aloha') // Logs nothing
message('Bonjour') // Length: 7
```

`computed` keeps track of the previously returned value and compares it with the new one, deciding if it should re-evaluate its dependents.

### Batching updates

Signals are cheap to write with, but synchoronous updates can be expensive. For example, if an effect subscribes to multiple signals, whose values are also updated synchronously, the effect may re-evaluate multiple times which is undesirable. The desired result should be for the effect to wait for all the signals to update, and then re-evaluate so that it only has to do it a single time.

`compostate` provides `batch` to group updates into a single flush.

```js
import { syncEffect, atom, batch } from 'compostate';

const greeting = atom('Hello');
const receiver = atom('Alexis');

syncEffect(() => {
  console.log(`${greeting()}, ${receiver()}!`); // 'Hello, Alexis!'
});

// Without batching
greeting('Bonjour'); // 'Bonjour, Alexis!'
receiver('Compostate'); // 'Bonjour, Compostate!'

// With batching
batch(() => {
  greeting('Bonjour'); // Update deferred
  receiver('Compostate'); // Update deferred
}); // 'Bonjour, Compostate!'
```

Do take note that in batching, writes are already applied, only the re-evaluation is deferred.

`compostate` also provides `unbatch` in case flushing updates synchronously is desirable.

### Cleanups

`compostate` provides `onCleanup` which can be called inside tracking calls such as `syncEffect`, `computed`, etc.. Registered cleanup callbacks are evaluated before tracking call are re-evaluated. This is useful when performing side-effects like subscribing to event listeners or making requests.

```js
import { onCleanup } from 'compostate';

syncEffect(() => {
  const request = makeRequest(someSignal());

  onCleanup(() => {
    // When someSignal changes, make sure to cancel
    // the current request.
    request.cancel();
  });
});
```

`onCleanup` will also run if `syncEffect` or `effect` are stopped.

```js
const stop = syncEffect(() => {
  onCleanup(() => {
    console.log('Stopped!');
  });
});

// ...
stop();
```

Tracking calls are cleanup boundaries, and tracking calls are also cleaned up by their parent cleanup boundaries, so if, for example, an effect is declared inside another effect, the nested effect is stopped when the parent effect is also stopped.

```js
const stop = syncEffect(() => {
  syncEffect(() => {
    onCleanup(() => {
      console.log('Stopped!');
    });
  });
});

// ...
stop();
```

`compostate` also provides `batchCleanup` which is what all tracking calls uses under the hood. `compostate` also provides `unbatchCleanup` if automatic cleanup is undesired.

### Error Boundaries

Like any other code, user code in effects and computations may throw an error. Normal `try`-`catch` won't work in `compostate` since by the time a re-evaluation happen, the try block may have already been escaped.

To solve this problem, `compostate` provides `errorBoundary` and `onError`.

```js
import { errorBoundary, onError } from 'compostate';

errorBoundary(() => {
  onError((error) => {
    console.error(error);
  });

  // Whenever the effect re-evaluation throws
  // the error boundary will be able to receive it.
  effect(() => doSomeUnsafeWork());
});
```

If a given `onError` throws an error on itself, the thrown error and the received error is forwarded to a parent `errorBoundary`.

If there's a callback that runs outside or uncaptured by `errorBoundary` (e.g. `setTimeout`) and you want the `errorBoundary` to capture it, you can use `captureError`:

```js
import { captureError } from 'compostate';

errorBoundary(() => {
  onError((error) => {
    console.error(error);
  });

  const capture = captureError();

  // Whenever the effect re-evaluation throws
  // the error boundary will be able to receive it.
  setTimeout(() => {
    try {
      doSomething();
    } catch (error) {
      capture(error);
    }
  })
});
```

### Context API

`compostate` provides a way to inject values through function calls, effects and computations

```js
import { contextual, createContext, writeContext, readContext } from 'compostate';

// Create a context instance with a default value
const message = createContext('Hello World');

function log() {
  // Read the context value
  console.log(readContext(message));
}

// Create a context boundary
contextual(() => {
  // Write a context value
  writeContext(message, 'Ohayo Sekai');

  log(); // 'Ohayo Sekai'
});
```

## Bindings

- [Web Components](https://github.com/lxsmnsyc/compostate/tree/main/packages/compostate-element)
- [React](https://github.com/lxsmnsyc/compostate/tree/main/packages/react-compostate)
- [Preact](https://github.com/lxsmnsyc/compostate/tree/main/packages/preact-compostate)

### Coming Soon

- SolidJS
- Svelte
- Vue

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
