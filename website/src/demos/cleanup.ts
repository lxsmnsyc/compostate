import { atom, batchCleanup, onCleanup, syncEffect } from 'compostate';
import { log, query } from './dom';

export function mount(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="demo-row">
      <label class="demo-field inline">
        Room
        <select>
          <option>general</option>
          <option>random</option>
          <option>help</option>
        </select>
      </label>
      <button type="button" data-stop>Stop the effect</button>
    </div>
    <ol class="demo-log"></ol>
  `;
  const list = query(root, '.demo-log');
  const select = query<HTMLSelectElement>(root, 'select');
  const stopButton = query<HTMLButtonElement>(root, '[data-stop]');

  const dispose = batchCleanup(() => {
    const room = atom(select.value);

    const stop = syncEffect(() => {
      const name = room();
      log(list, `join #${name}`);
      // Runs before the next run, and when the effect stops.
      onCleanup(() => {
        log(list, `leave #${name}`);
      });
    });

    select.addEventListener('change', () => {
      room(select.value);
    });
    stopButton.addEventListener('click', () => {
      stop();
      stopButton.disabled = true;
      select.disabled = true;
    });
  });

  return dispose;
}
