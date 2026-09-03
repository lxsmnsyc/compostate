# API reference

Everything on this page is exported from `compostate`.

## Reactive values

### `atom(value, options?)`

Creates a read and write unit of reactivity. Call it with no argument to read,
and with one argument to write. Writing returns the stored value.

```js
const count = atom(0);
count(); // 0
count(1); // 1
```

Pass `options.isEqual` to control when a write counts as a change. The default
treats values as equal when they are the same reference, and treats `NaN` as
equal to itself.

### `signal(value, options?)`

The same unit of reactivity, split into a reader and a writer. The writer also
accepts a function that receives the previous value.

```js
const [count, setCount] = signal(0);
setCount(prev => prev + 1);
```

### `pulse()`

Creates a value-less signal. Returns a `[track, update]` pair. Call `track` to
subscribe and `update` to notify every subscriber.

### `computed(compute, options?)`

Creates a derived value. It is lazy, so it only runs on the first read, and it
reruns only when one of its tracked dependencies changed.

The compute function receives the previous result as `{ value }`, or `undefined`
on the first run. Errors are memoized and rethrown on every read until the value
recomputes.

### `deferred(compute, options?)`

Like `computed`, but recomputation is scheduled on the idle queue. Reads return
the previous value until the queue is drained.

### `resource(compute, options?)`

Like `computed`, but the compute function may return a promise. See
[Concurrency](./concurrency.md).

## Effects

### `syncEffect(callback)`

Runs the callback immediately and reruns it whenever a tracked dependency
changes. Returns a function that stops the effect.

### `effect(callback)`

The same, but every run is scheduled on the idle queue. Returns a function that
stops the effect.

### `untrack(callback)`

Runs the callback without recording anything it reads as a dependency. Returns
the callback's result.

### `flushIdle()`

Drains every pending deferred computation synchronously.

## Batching

### `batch(callback)`

Groups the writes made inside the callback so that dependent effects rerun once
at the end. Writes still apply immediately, only the reruns are deferred.

### `unbatch(callback)`

Opts out of the surrounding batch, so writes flush as they happen.

## Cleanups

### `onCleanup(callback)`

Registers a callback on the nearest cleanup boundary. It runs before the
boundary reruns and when the boundary is disposed. Returns the callback.

Outside of a cleanup boundary it does nothing.

### `batchCleanup(callback)`

Runs the callback inside a new cleanup boundary. Returns a function that
disposes the boundary. Disposing runs every cleanup registered inside it,
including nested boundaries and effects.

### `unbatchCleanup(callback)`

Runs the callback with no cleanup boundary, so nothing registered inside it is
tied to the enclosing boundary. Returns the callback's result.

## Error handling

### `errorBoundary(callback, handler)`

Runs the callback with `handler` installed as the error boundary. The handler
receives errors thrown by the effects and computations created inside the
callback. It does not receive errors thrown by the callback itself.

If the handler throws, both the new error and the original error are forwarded
to the parent boundary. With no parent boundary the error is rethrown.

Returns the callback's result.

### `captureError()`

Returns a function that forwards an error to the boundary that was active when
`captureError` was called. Use it to route errors from callbacks that run
outside the boundary, such as a `setTimeout`.

## Context

### `createContext(defaultValue)`

Creates a context instance.

### `contextual(callback)`

Runs the callback inside a new context tree. Returns the callback's result.

### `writeContext(context, value)`

Writes a value into the current context tree.

### `readContext(context)`

Reads the nearest written value, walking up the tree. Falls back to the default
value.

Contexts are visible to effects created inside the tree. They are not visible
inside `computed`, `deferred` or `resource`.

## Suspense

### `suspenseBoundary(callback, handler)`

Runs the callback with `handler` installed as the suspense boundary. The handler
is called whenever an effect created inside the callback reads a pending
resource. Returns the callback's result.

### `isPending(callback)`

Runs the callback and returns `true` when it threw a `ResourceNotReadyError`.

### `ResourceNotReadyError`

The error thrown by a pending read. Its `request` property is the promise that
is still in flight.

## Concurrency

`toResult`, `waitForNone`, `waitForAll`, `waitForAny` and `waitForRace` are
documented in [Concurrency](./concurrency.md).

## Types

`Atom`, `AtomOptions`, `Cleanup`, `Computation`, `ComputedOptions`, `Context`,
`Effect`, `ErrorHandler`, `IsEqual`, `Pulse`, `Ref`, `ResourceComputation`,
`Result`, `ResultSignals`, `Signal`, `SignalOptions`, `SignalSetState`,
`SignalSetStateAction`, `SuspenseHandler`, `UnwrapSignal` and `UnwrapSignals`
are exported as types.
