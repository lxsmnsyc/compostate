# Custom elements

`compostate/element` defines custom elements whose rendering is driven by
compostate.

## Setting a renderer

The binding does not ship a renderer. Pick one first, and call `setRenderer`
before any element connects.

```js
import { setRenderer } from 'compostate/element';
import { html, render } from 'lit-html';

setRenderer((root, result) => {
  render(result, root);
});
```

The renderer receives the element's shadow root and whatever the render function
returned. Rendering before a renderer is set throws.

## Defining an element

```js
import { atom } from 'compostate';
import { define } from 'compostate/element';
import { html } from 'lit-html';

define({
  name: 'counter-button',
  setup() {
    const count = atom(0);

    return () => html`
      <button @click=${() => count(count() + 1)}>Count: ${count()}</button>
    `;
  },
});
```

`name` is converted to a valid custom element name, so `CounterButton` and
`counter-button` both register as `counter-button`.

You can also pass the setup function on its own. The tag name is then derived
from the function name.

```js
define(function CounterButton() {
  return () => html`<button>Count</button>`;
});
```

## Props

List the attributes you want to observe in `props`. They arrive in the setup
function as a reactive object of strings.

```js
define({
  name: 'counter-title',
  props: ['value'],
  setup(props) {
    return () => html`<h1>Count: ${props.value}</h1>`;
  },
});
```

The setup function runs once when the element connects. Only the render function
reruns when an attribute changes.

Attributes are strings, so a prop is `undefined` until the attribute is set.

## Lifecycle hooks

Call these inside the setup function.

- `onConnected(callback)` runs after the element connects.
- `onDisconnected(callback)` runs before the element is cleaned up.
- `onUpdated(callback)` runs after every rerender except the first.
- `onAdopted(callback)` runs when the element moves to another document.

```js
import { define, onConnected, onDisconnected } from 'compostate/element';

define({
  name: 'lifecycle-demo',
  setup() {
    onConnected(() => console.log('connected'));
    onDisconnected(() => console.log('disconnected'));

    return () => html`<span>demo</span>`;
  },
});
```

## Scheduling

Rendering runs on the idle queue, so the first paint happens shortly after the
element connects rather than during `connectedCallback`. Call `flushIdle` to
render right away, which is what tests usually want.
