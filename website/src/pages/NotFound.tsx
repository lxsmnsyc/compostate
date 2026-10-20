import type { JSX } from '@solidjs/web';
import { ArrowRightIcon } from '../components/Icons';
import PageMeta from '../components/PageMeta';
import { FIRST_PAGE } from '../lib/docs';

export default function NotFound(): JSX.Element {
  return (
    <div class="not-found">
      <PageMeta
        title="Page not found"
        description="This page does not exist."
      />
      <p class="not-found-code gradient-text">404</p>
      <h1>Nothing tracks this page</h1>
      <p>It does not exist, or it moved.</p>
      <div class="hero-actions">
        <a class="button button-primary" href={FIRST_PAGE.href}>
          Read the docs <ArrowRightIcon />
        </a>
        <a class="button button-secondary" href="/">
          Home
        </a>
      </div>
    </div>
  );
}
