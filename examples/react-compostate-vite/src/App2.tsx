import { defineComponent, onEffect } from 'react-compostate';
import { state } from 'compostate';
import React from 'react';

interface CounterMessageProps {
  value: number;
}

const CounterMessage = defineComponent<CounterMessageProps>(({ value }) => {
  onEffect(() => {
    console.log('Count: ', value.value);
  });
  return () => (
    <h1>{`Count: ${value.value}`}</h1>
  );
});

const Counter = defineComponent(() => {
  const count = state(() => 0);

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

export default function App2(): JSX.Element {
  return (
    <>
      <h1>
        {'With '}
        <code>defineComponent</code>
      </h1>
      <Counter />
    </>
  );
}
