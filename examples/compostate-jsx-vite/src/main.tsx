// /** @jsx c */
// /** @jsxFrag Fragment */
import { c, Fragment } from 'compostate-jsx';
import { computed, ref } from 'compostate';

function Shown(props: { value: boolean }) {
  return (
    c(Fragment, {}, computed(() => (props.value && c('h1', {}, 'Hello World'))))
  );
}

function ButtonMessage(props: { value: boolean }) {
  return (
    c(Fragment, {}, computed(() => (props.value ? 'Hide' : 'Show')))
  );
}

function Toggle() {
  const show = ref(false);

  function onClick() {
    show.value = !show.value;
  }

  return (
    c('div', {}, ...[
      c('button', { onClick }, c(ButtonMessage, { value: show })),
      c(Shown, { value: show }),
      c('h1', {}, 'Test'),
    ])
  );
}

function App() {
  return (
    c('div', {}, c(Toggle, {}))
  );
}

const root = document.getElementById('root');

if (root) {
  c(App, {}).render(root);
}
