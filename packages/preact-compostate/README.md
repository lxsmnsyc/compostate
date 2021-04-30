# preact-compostate

> Preact bindings for `compostate`

[![NPM](https://img.shields.io/npm/v/preact-compostate.svg)](https://www.npmjs.com/package/preact-compostate) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)[![Open in CodeSandbox](https://img.shields.io/badge/Open%20in-CodeSandbox-blue?style=flat-square&logo=codesandbox)](https://codesandbox.io/s/github/LXSMNSYC/compostate/tree/main/examples/preact-compostate-vite)

## Install

```bash
npm install --save compostate preact-compostate
```

```bash
yarn add compostate preact-compostate
```

## Usage

```tsx
import { effect, state } from 'preact-compostate';
import React from 'react';
import { CompostateRoot, useCompostateSetup } from 'preact-compostate';

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

function InnerApp(): JSX.Element {
  const value = useCompostate(count);

  return (
    <>
      <h1>{`Count: ${value}`}</h1>
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
