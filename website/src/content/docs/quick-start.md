---
title: Quick start
description: Install compostate, create state, derive from it and react to it.
---

## Install

```bash
npm install compostate
```

## Create state

An atom holds a value. Call it with no argument to read, and with one argument to write.

```js
import { atom } from 'compostate';

const count = atom(0);

count(); // 0
count(1); // 1
```

## React to it

`syncEffect` runs a function right away and records every atom it reads. When one of them changes, the function runs again.

```js
import { atom, syncEffect } from 'compostate';

const count = atom(0);

syncEffect(() => {
  console.log('Count:', count()); // Logs 'Count: 0'
});

count(1); // Logs 'Count: 1'
```

`syncEffect` returns a function that stops the effect.

## Derive from it

`computed` derives a value from others. It runs on its first read, and it only passes a change on when its result changes.

```js
import { atom, computed, syncEffect } from 'compostate';

const message = atom('Hello');
const length = computed(() => message().length);

syncEffect(() => {
  console.log('Length:', length()); // Logs 'Length: 5'
});

message('Aloha'); // Same length, so nothing is logged
message('Bonjour'); // Logs 'Length: 7'
```

:::demo computed
Type in the box. The computed reruns on every keystroke, but the effect only reruns when the length changes.
:::

## Clean up

`onCleanup` registers a function that runs before the effect reruns, and when it stops. Use it to undo whatever the last run did.

```js
import { atom, onCleanup, syncEffect } from 'compostate';

const room = atom('general');

const stop = syncEffect(() => {
  const name = room();
  const connection = join(name);

  onCleanup(() => {
    connection.leave();
  });
});

room('random'); // Leaves #general, then joins #random
stop(); // Leaves #random
```

## Use it in a component

The bindings turn a setup function into a component. The setup runs once, and the render function it returns reruns when something it read changes.

```jsx
import { atom } from 'compostate';
import { defineComponent } from 'compostate/react';

const Counter = defineComponent(() => {
  const count = atom(0);

  return () => (
    <button type="button" onClick={() => count(count() + 1)}>
      Count: {count()}
    </button>
  );
});
```

## Next steps

- [Concepts](./concepts.md) covers batching, error boundaries, contexts and scheduling.
- [Concurrency](./concurrency.md) covers async values.
- [React and Preact](./react.md) and [Custom elements](./custom-elements.md) cover the bindings.
