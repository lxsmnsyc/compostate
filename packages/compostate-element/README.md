# compostate-element

> Web Components bindings for [compostate](https://github.com/lxsmnsyc/compostate/tree/main/packages/compostate)

[![NPM](https://img.shields.io/npm/v/compostate-element.svg)](https://www.npmjs.com/package/compostate-element) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --save compostate compostate-element
```

```bash
yarn add compostate compostate-element
```

```bash
pnpm add compostate compostate-element
```

## Usage

```js
import { ref, effect } from 'compostate';
import { setRenderer, define } from 'compostate-element';
import { render, html } from 'lit-html';

// Setup the element's renderer using Lit
// Any renderer should work
setRenderer((root, result) => {
  render(result, root);
});

// Define an element
define({
  // Name of the element (required)
  name: 'counter-title',
  // Props to be tracked (required)
  props: ['value'],
  // Element setup
  setup(props) {
    // The setup method is run only once
    // it's useful to setup your component logic here.
    effect(() => {
      // Props are reactive
      console.log(`Current count: ${props.value}`);
    });

    // Return the template atom
    // The template's returned value depends
    // on the renderer's templates.
    // For example, you can return a JSX markup
    // if the renderer used is React or Preact.
    return () => (
      html`
        <h1>Count: ${props.value}</h1>
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
```

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
