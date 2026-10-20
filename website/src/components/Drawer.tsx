import type { JSX } from '@solidjs/web';
import { Show } from 'solid-js';
import { menuOpen, REPOSITORY_URL, setMenuOpen } from '../lib/ui';
import DocsNav from './DocsNav';
import { CloseIcon } from './Icons';

/** The site navigation on small screens. */
export default function Drawer(): JSX.Element {
  function close(): void {
    setMenuOpen(false);
  }

  return (
    <Show when={menuOpen()}>
      <div class="drawer-backdrop" onClick={close}>
        <div
          class="drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          onClick={event => {
            event.stopPropagation();
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              close();
            }
          }}
        >
          <button
            type="button"
            class="icon-button drawer-close"
            aria-label="Close navigation"
            onClick={close}
          >
            <CloseIcon />
          </button>
          <nav class="drawer-links" aria-label="Site">
            <a href="/" onClick={close}>
              Home
            </a>
            <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </nav>
          <DocsNav />
        </div>
      </div>
    </Show>
  );
}
