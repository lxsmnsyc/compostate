import { effect, state } from 'compostate';
import { CompostateRoot, useCompostate } from 'preact-compostate';

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
      <button type="button" onClick={increment}>
        Increment
      </button>
      <button type="button" onClick={decrement}>
        Decrement
      </button>
      <h1>{`Count: ${value}`}</h1>
    </>
  );
}

function App(): JSX.Element {
  return (
    <CompostateRoot>
      <h1>
        {'With '}
        <code>useCompostate</code>
      </h1>
      <InnerApp />
    </CompostateRoot>
  );
}

export default App;
