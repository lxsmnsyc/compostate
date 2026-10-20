---
title: Introduction
description: What compostate is, what it ships, and how its pieces fit together.
---

compostate is a small reactive core built on atoms, computed values and effects. An effect records the values it reads while it runs. When one of them changes, that effect runs again, and nothing else does.

```js
import { atom, computed, syncEffect } from 'compostate';

const count = atom(0);
const doubled = computed(() => count() * 2);

syncEffect(() => {
  console.log('Doubled:', doubled());
});

count(1); // Logs 'Doubled: 2'
```

:::demo counter
The counter below is an atom and one effect that writes its value into the page.
:::

## What it ships

compostate is one package. The bindings are subpath exports, so there is only one reactive graph at runtime, whichever renderer you use.

| Import               | What it gives you                                     |
| -------------------- | ----------------------------------------------------- |
| `compostate`         | The reactive core and the concurrency helpers.        |
| `compostate/react`   | `defineComponent` and `useCompostateSetup` for React. |
| `compostate/preact`  | The same bindings for Preact.                         |
| `compostate/element` | `define` and `setRenderer` for custom elements.       |

React and Preact are optional peer dependencies. Install only the one you use.

## The pieces

- **Atoms and signals** hold values. Call an atom with no argument to read it, and with one argument to write it.
- **Effects** run code and track what it reads. `syncEffect` reruns right away, and `effect` reruns on an idle queue.
- **Computed values** derive from other values. They are lazy, and they stop an update when they return an equal value.
- **Cleanups** run before an effect reruns and when it stops. Effects created inside another effect stop with it.
- **Resources** are computed values backed by a promise. Suspense boundaries and the `waitFor*` helpers decide what to do while they are pending.

## Where to go next

- [Quick start](./quick-start.md) builds a small example step by step.
- [Concepts](./concepts.md) covers each piece in detail.
- [Concurrency](./concurrency.md) covers resources and suspense.
- [API reference](./api.md) lists every export.
