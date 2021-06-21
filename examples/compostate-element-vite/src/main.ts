import { state, effect } from "compostate";
import { setRenderer, define } from "compostate-element";
import { render, html } from "lit-html";

setRenderer((root, result) => {
  render(result, root);
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

define(function CounterButton() {
  const count = state(() => 0);

  function increment() {
    count.value += 1;
  }

  function decrement() {
    count.value -= 1;
  }

  return () => (
    html`
      <button @click=${increment}>Increment</button>
      <button @click=${decrement}>Decrement</button>
      <counter-title value="${count.value}"></counter-title>
    `
  );
});

define(function CustomApp() {
  return () => (
    html`
      <counter-button></counter-button>
    `
  );
});