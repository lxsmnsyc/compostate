import { ref, effect, computed } from 'compostate';
import { setRenderer, define } from 'compostate-element';
import { render, html } from 'lit-html';

setRenderer((root, result) => {
  render(result, root);
});

define({
  name: 'counter-title',
  props: ['value'],
  setup(props) {
    const message = computed(() => `Current count: ${props.value}`);
    effect(() => {
      console.log(message());
    });

    return () => (
      html`
        <h1>${message()}</h1>
      `
    );
  },
});

define({
  name: 'counter-button',
  setup() {
    const count = ref(0);

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
  },
});

define({
  name: 'custom-app',
  setup() {
    return () => (
      html`
        <counter-button></counter-button>
      `
    );
  },
});
