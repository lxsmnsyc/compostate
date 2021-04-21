import { effect, state } from 'compostate';
import React from 'react';
import { CompostateRoot, useCompostateSetup } from 'react-compostate';

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

export default App;
