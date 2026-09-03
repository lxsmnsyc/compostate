# Concurrency

## Resources

A resource is a computed value backed by a promise. It runs lazily on the first
read and reruns when one of its tracked dependencies changes.

```js
import { atom, resource } from 'compostate';

const userId = atom(1);
const user = resource(async () => {
  const response = await fetch(`/api/users/${userId()}`);
  return response.json();
});
```

Reading a resource has three outcomes.

- It returns the value once the promise has resolved.
- It throws a `ResourceNotReadyError` while the promise is pending.
- It throws the rejection reason once the promise has rejected.

The thrown `ResourceNotReadyError` carries the pending promise on its `request`
property, so a caller can wait for it.

## Suspense

A pending read is reported as a thrown error rather than a special value. That
lets a caller several frames up decide what to show, without every function in
between having to check for a loading state.

`suspenseBoundary` installs the handler that is called when an effect created
inside it reads a pending resource.

```js
import { atom, resource, suspenseBoundary, syncEffect } from 'compostate';

const pending = atom(false);

suspenseBoundary(
  () => {
    const user = resource(() => fetchUser());

    syncEffect(() => {
      render(user());
      pending(false);
    });
  },
  () => {
    pending(true);
  },
);
```

The handler runs every time a read suspends. It is not called when nothing is
pending.

## APIs

### `isPending`

Runs a callback and reports whether it suspended. It returns `true` only when the
callback threw a `ResourceNotReadyError`. A callback that throws a plain error
reports `false`, so use `toResult` when you need to tell a failure apart from a
success.

```js
import { isPending } from 'compostate';

if (isPending(user)) {
  showSpinner();
}
```

### `toResult`

Reads one signal and describes what happened, without throwing.

```js
import { toResult } from 'compostate';

const result = toResult(user);

switch (result.type) {
  case 'pending':
    // `result.request` is the promise that is still in flight.
    break;
  case 'success':
    console.log(result.value);
    break;
  case 'failure':
    console.error(result.value);
    break;
}
```

### `waitForNone`

Reads every signal and returns one result per signal. It never throws.

```js
import { waitForNone } from 'compostate';

const [first, second] = waitForNone([userA, userB]);
```

### `waitForAll`

Returns every value once all of the signals have resolved.

- It suspends while at least one signal is pending.
- It throws an `AggregateError` once every signal has settled and at least one
  of them failed.

```js
import { waitForAll } from 'compostate';

const [a, b] = waitForAll([userA, userB]);
```

### `waitForAny`

Returns the value of the first signal that resolved successfully.

- It suspends while none of the signals succeeded and at least one is pending.
- It throws an `AggregateError` once every signal has failed.

```js
import { waitForAny } from 'compostate';

const fastest = waitForAny([mirrorA, mirrorB]);
```

### `waitForRace`

Returns the value of the first signal that settled, whether it succeeded or
failed. It suspends while every signal is still pending.

```js
import { waitForRace } from 'compostate';

const first = waitForRace([mirrorA, mirrorB]);
```
