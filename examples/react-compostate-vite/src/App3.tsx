import { onEffect, useCompostateSetup } from 'react-compostate';
import { ref } from 'compostate';
import React from 'react';

interface CounterMessageProps {
  value: number;
}

function CounterMessage(props: CounterMessageProps): JSX.Element {
  const { value } = useCompostateSetup((reactiveProps) => {
    onEffect(() => {
      console.log('Count: ', reactiveProps.value);
    });

    return () => ({
      value: reactiveProps.value,
    });
  }, props);
  return (
    <h1>{`Count: ${value}`}</h1>
  );
}

function Counter(): JSX.Element {
  const counter = useCompostateSetup(() => {
    const count = ref(0);

    onEffect(() => {
      console.log('Count: ', count.value);
    });

    function increment() {
      count.value += 1;
    }

    function decrement() {
      count.value -= 1;
    }

    return () => ({
      increment,
      decrement,
      value: count.value,
    });
  }, {});

  return (
    <>
      <button type="button" onClick={counter.increment}>
        Increment
      </button>
      <button type="button" onClick={counter.decrement}>
        Decrement
      </button>
      <CounterMessage value={counter.value} />
    </>
  );
}

export default function App2(): JSX.Element {
  return (
    <>
      <h1>
        {'With '}
        <code>useCompostateSetup</code>
      </h1>
      <Counter />
    </>
  );
}
