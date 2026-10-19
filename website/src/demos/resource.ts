import { atom, batchCleanup, resource, syncEffect, toResult } from 'compostate';
import { query } from './dom';

const USERS = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Linus Torvalds'];

// Stands in for a request that takes a while.
async function fetchUser(id: number): Promise<string> {
  await new Promise(resolve => {
    setTimeout(resolve, 700);
  });
  return USERS[(id - 1) % USERS.length];
}

export function mount(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="demo-row">
      <button type="button" data-step="-1">Previous</button>
      <output data-id></output>
      <button type="button" data-step="1">Next</button>
    </div>
    <p class="demo-status"></p>
  `;
  const status = query(root, '.demo-status');

  const dispose = batchCleanup(() => {
    const userId = atom(1);
    // Read the dependencies before the first `await`, so they are tracked.
    const user = resource(() => fetchUser(userId()));

    syncEffect(() => {
      query(root, '[data-id]').textContent = `User #${userId()}`;
    });

    syncEffect(() => {
      const result = toResult(user);
      status.dataset.state = result.type;
      status.textContent =
        result.type === 'pending'
          ? 'Loading…'
          : result.type === 'success'
            ? String(result.value)
            : `Failed: ${String(result.value)}`;
    });

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      '[data-step]',
    )) {
      button.addEventListener('click', () => {
        userId(Math.max(1, userId() + Number(button.dataset.step)));
      });
    }
  });

  return dispose;
}
