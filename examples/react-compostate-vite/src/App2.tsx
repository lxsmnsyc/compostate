import { defineComponent, onEffect } from 'react-compostate';
import { ref } from 'compostate';
import React from 'react';

interface CounterMessageProps {
  value: number;
}

const CounterMessage = defineComponent<CounterMessageProps>((props) => {
  onEffect(() => {
    console.log('Count: ', props.value);
  });
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
