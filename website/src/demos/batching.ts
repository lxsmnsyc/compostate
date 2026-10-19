import { atom, batch, batchCleanup, syncEffect } from 'compostate';
import { log, query } from './dom';

const GREETINGS = ['Hello', 'Bonjour', 'Hola', 'Ciao', 'Hallo'];
const NAMES = ['Alexis', 'Ada', 'Grace', 'Linus', 'Margaret'];

export function mount(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="demo-row">
      <button type="button" data-separate>Write separately</button>
      <button type="button" data-batch>Write in a batch</button>
    </div>
    <ol class="demo-log"></ol>
  `;
  const list = query(root, '.demo-log');

  const dispose = batchCleanup(() => {
    const greeting = atom(GREETINGS[0]);
    const name = atom(NAMES[0]);
    let turn = 0;

    syncEffect(() => {
      log(list, `${greeting()}, ${name()}!`);
    });

    function next(): [string, string] {
      turn += 1;
      return [GREETINGS[turn % GREETINGS.length], NAMES[turn % NAMES.length]];
    }

    query(root, '[data-separate]').addEventListener('click', () => {
      const [nextGreeting, nextName] = next();
      log(list, '— two writes');
      greeting(nextGreeting);
      name(nextName);
    });
    query(root, '[data-batch]').addEventListener('click', () => {
      const [nextGreeting, nextName] = next();
      log(list, '— two writes in one batch');
      batch(() => {
        greeting(nextGreeting);
        name(nextName);
      });
    });
  });

  return dispose;
}
