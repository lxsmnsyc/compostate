import { atom, effect } from 'compostate';
import { define, setRenderer } from 'compostate/element';
import { html, render } from 'lit-html';

setRenderer((root, result) => {
  render(result, root);
});

define({
  name: 'counter-title',
  props: ['value'],
  setup(props) {
    effect(() => {
      console.log(`Current count: ${props.value}`);
    });

    return () => html` <h1>Count: ${props.value}</h1> `;
  },
});

define({
  name: 'counter-button',
  setup() {
    const count = atom(0);

    function increment(): void {
      count(count() + 1);
    }

    function decrement(): void {
      count(count() - 1);
    }

    return () => html`
      <button @click=${increment}>Increment</button>
      <button @click=${decrement}>Decrement</button>
      <counter-title value="${count()}"></counter-title>
    `;
  },
});

define({
  name: 'custom-app',
  setup() {
    return () => html` <counter-button></counter-button> `;
  },
});
