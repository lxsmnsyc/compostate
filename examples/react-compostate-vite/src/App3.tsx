import { atom } from 'compostate';
import { onEffect, useCompostateSetup } from 'compostate/react';
import type { JSX } from 'react';

interface CounterMessageProps {
  value: number;
}

function CounterMessage(props: CounterMessageProps): JSX.Element {
  const { value } = useCompostateSetup(reactiveProps => {
    onEffect(() => {
      console.log('Count: ', reactiveProps.value);
    });

    return () => ({
      value: reactiveProps.value,
    });
  }, props);
  return <h1>{`Count: ${value}`}</h1>;
}

function Counter(): JSX.Element {
  const counter = useCompostateSetup(() => {
    const count = atom(0);

    onEffect(() => {
      console.log('Count: ', count());
    });

    function increment(): void {
      count(count() + 1);
    }

    function decrement(): void {
      count(count() - 1);
    }

    return () => ({
      increment,
      decrement,
      value: count(),
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

export default function App3(): JSX.Element {
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
