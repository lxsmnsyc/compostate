import { atom, batchCleanup, computed, syncEffect } from 'compostate';
import { query } from './dom';

export function mount(root: HTMLElement): () => void {
  root.innerHTML = `
    <label class="demo-field">
      Message
      <input type="text" value="Hello" spellcheck="false" />
    </label>
    <dl class="demo-stats">
      <div><dt>length()</dt><dd data-length></dd></div>
      <div><dt>effect runs</dt><dd data-runs></dd></div>
    </dl>
  `;
  const input = query<HTMLInputElement>(root, 'input');

  const dispose = batchCleanup(() => {
    const message = atom(input.value);
    // Reruns on every keystroke, but only passes a change on when the
    // length is different.
    const length = computed(() => message().length);

    let runs = 0;
    syncEffect(() => {
      runs += 1;
      query(root, '[data-length]').textContent = String(length());
      query(root, '[data-runs]').textContent = String(runs);
    });

    input.addEventListener('input', () => {
      message(input.value);
    });
  });

  return dispose;
}
