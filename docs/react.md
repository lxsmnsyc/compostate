# React and Preact

`compostate/react` and `compostate/preact` expose the same API. Import from the
one that matches your renderer.

```js
import { defineComponent, useCompostateSetup } from 'compostate/react';
import { defineComponent, useCompostateSetup } from 'compostate/preact';
```

React and Preact are optional peer dependencies, so install only the one you
use.

## `defineComponent(setup)`

Turns a setup function into a component.

The setup function runs once for the lifetime of the component. It receives a
reactive props object and returns a render function. The render function reruns
whenever one of the values it read changes, and the component rerenders with the
new result.

```jsx
import { atom } from 'compostate';
import { defineComponent } from 'compostate/react';

const Counter = defineComponent(() => {
  const count = atom(0);

  function increment() {
    count(count() + 1);
  }

  return () => (
    <button type="button" onClick={increment}>
      Count: {count()}
    </button>
  );
});
```

Props are tracked per key, so a render function that reads only `props.value`
does not rerun when another prop changes.

```jsx
const Message = defineComponent(props => () => <h1>Count: {props.value}</h1>);
```

## `useCompostateSetup(setup, props)`

The hook behind `defineComponent`. Use it when the setup should produce
something other than markup, such as a set of handlers.

```jsx
import { atom } from 'compostate';
import { useCompostateSetup } from 'compostate/react';

function Counter() {
  const counter = useCompostateSetup(() => {
    const count = atom(0);

    return () => ({
      value: count(),
      increment: () => count(count() + 1),
    });
  }, {});

  return (
    <button type="button" onClick={counter.increment}>
      Count: {counter.value}
    </button>
  );
}
```

## Lifecycle hooks

Call these inside the setup function.

- `onMounted(callback)` runs after the component mounts.
- `onUnmounted(callback)` runs after the component unmounts.
- `onUpdated(callback)` runs after every rerender except the first.
- `onEffect(callback)` registers a deferred `effect` that starts once the
  component mounts and stops when it unmounts.

```jsx
import { atom } from 'compostate';
import { defineComponent, onEffect, onMounted } from 'compostate/react';

const Counter = defineComponent(() => {
  const count = atom(0);

  onMounted(() => {
    console.log('mounted');
  });

  onEffect(() => {
    console.log('Count:', count());
  });

  return () => <span>{count()}</span>;
});
```

## Notes

- The setup function runs untracked, so reading a signal there does not
  subscribe the component. Read inside the render function instead.
- Cleanups registered with `onCleanup` inside the setup run when the component
  unmounts.
- `onEffect` uses the idle queue. In tests, call `flushIdle` to run the pending
  effects.
