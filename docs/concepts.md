# Concepts

## Signals and Atoms

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

## Effects

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

## Deriving signals

## Cleanups

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

## Error boundaries

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

## Contexts

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
