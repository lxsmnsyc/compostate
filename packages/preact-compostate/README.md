# preact-compostate

> Preact bindings for [compostate](https://github.com/lxsmnsyc/compostate/tree/main/packages/compostate)

[![NPM](https://img.shields.io/npm/v/preact-compostate.svg)](https://www.npmjs.com/package/preact-compostate) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --save compostate preact-compostate
```

```bash
yarn add compostate preact-compostate
```

```bash
pnpm add compostate preact-compostate
```

## Usage

```js
import { defineComponent, onEffect } from 'preact-compostate';
import { ref } from 'compostate';

// Define a component
const CounterMessage = defineComponent((props) => {
  // This function only runs once, hooks cannot be used here.

  // preact-compostate provides `onEffect` as a lifecycle hook
  // You can use this instead of tracking API like `effect`
  onEffect(() => {
    console.log('Count: ', props.value);
  });

  // Return the render atom
  return () => (
    <h1>{`Count: ${props.value}`}</h1>
  );
});

const Counter = defineComponent(() => {
  const count = ref(0);

  function increment() {
    count.value += 1;
  }

  function decrement() {
    count.value -= 1;
  }

  return () => (
    <>
      <button type="button" onClick={increment}>
        Increment
      </button>
      <button type="button" onClick={decrement}>
        Decrement
      </button>
      <CounterMessage value={count.value} />
    </>
  );
});
```

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
