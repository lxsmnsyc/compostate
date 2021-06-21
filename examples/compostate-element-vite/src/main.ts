import { state, effect } from "compostate";
import { setRenderer, define, onErrorCaptured } from "compostate-element";
import { render, html } from "lit-html";

setRenderer((root, result) => {
  render(result, root);
});

define({
  name: 'custom-error',
  setup() {
    return () => {
      throw new Error('render-time error!');
    };
  },
});

define({
  name: 'counter-title',
  props: ['value'],
  setup({ value }) {
    effect(() => {
      console.log(`Current count: ${value.value}`);
    });

    return () => (
      html`
        <h1>Count: ${value.value}</h1>
      `
    );
  },
});

define({
  name: 'counter-button',
  setup() {
    const count = state(() => 0);

    function onClick() {
      count.value += 1;
    }

    return () => (
      html`
        <button @click=${onClick}>Increment</button>
        <counter-title value="${count.value}"></counter-title>
      `
    );
  },
});

define({
  name: 'custom-app',
  setup() {
    onErrorCaptured((error) => {
      console.log('Received error!', error);
    });

    return () => (
      html`
        <counter-button></counter-button>
        <custom-error></custom-error>
      `
    );
  },
});