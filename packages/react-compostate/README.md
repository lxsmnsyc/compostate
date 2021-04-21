# react-compostate

> React bindings for `compostate`

[![NPM](https://img.shields.io/npm/v/react-compostate.svg)](https://www.npmjs.com/package/react-compostate) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --save compostate react-compostate
```

```bash
yarn add compostate react-compostate
```

## Usage

```tsx
import { effect, state } from 'react-compostate';
import React from 'react';
import { CompostateRoot, useCompostateSetup } from 'react-react-compostate';

function setup() {
  const count = state(() => 0);

  function increment() {
    count.value += 1;
  }

  function decrement() {
    count.value -= 1;
  }

  effect(() => {
    console.log(count.value);
  });

  return () => ({
    increment,
    decrement,
    count: count.value,
  });
}

function InnerApp(): JSX.Element {
  const { increment, decrement, count } = useCompostateSetup(setup);

  return (
    <>
      <h1>{`Count: ${count}`}</h1>
      <button type="button" onClick={increment}>
        Increment
      </button>
      <button type="button" onClick={decrement}>
        Decrement
      </button>
    </>
  );
}

function App(): JSX.Element {
  return (
    <CompostateRoot>
      <InnerApp />
    </CompostateRoot>
  );
}
```

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
