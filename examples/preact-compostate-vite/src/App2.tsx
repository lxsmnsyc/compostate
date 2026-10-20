import { atom } from 'compostate';
import { defineComponent, onEffect } from 'compostate/preact';
import type { JSX } from 'preact';

interface CounterMessageProps {
  value: number;
}

const CounterMessage = defineComponent<CounterMessageProps>(props => {
  onEffect(() => {
    console.log('Count: ', props.value);
  });
  return () => <h1>{`Count: ${props.value}`}</h1>;
});

const Counter = defineComponent(() => {
  const count = atom(0);

  function increment(): void {
    count(count() + 1);
  }

  function decrement(): void {
    count(count() - 1);
  }

  return () => (
    <>
      <button type="button" onClick={increment}>
        Increment
      </button>
      <button type="button" onClick={decrement}>
        Decrement
      </button>
      <CounterMessage value={count()} />
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
