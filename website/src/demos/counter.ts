import { atom, batchCleanup, syncEffect } from 'compostate';
import { query } from './dom';

export function mount(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="demo-row">
      <button type="button" data-step="-1">−1</button>
      <output></output>
      <button type="button" data-step="1">+1</button>
      <button type="button" data-reset>Reset</button>
    </div>
  `;
  const output = query(root, 'output');

  // Everything created inside the boundary is stopped by `dispose`.
  const dispose = batchCleanup(() => {
    const count = atom(0);

    // Runs now, and again whenever `count` changes.
    syncEffect(() => {
      output.textContent = `Count: ${count()}`;
    });

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      '[data-step]',
    )) {
      button.addEventListener('click', () => {
        count(count() + Number(button.dataset.step));
      });
    }
    query(root, '[data-reset]').addEventListener('click', () => {
      count(0);
    });
  });

  return dispose;
}
