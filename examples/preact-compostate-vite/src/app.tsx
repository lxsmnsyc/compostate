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

export default App;
