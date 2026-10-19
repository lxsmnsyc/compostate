import { language as bash } from '@twinkleplop/bash';
import { language as tsx } from '@twinkleplop/tsx';
import { language as typescript } from '@twinkleplop/typescript';

type Highlighter = (code: string) => string;

const ts = typescript();
const jsx = tsx();
const shell = bash();

// The JavaScript grammars are supersets of each other, so the TypeScript and
// TSX ones cover plain JavaScript and JSX too.
const LANGUAGES: Partial<Record<string, Highlighter>> = {
  js: ts,
  ts,
  jsx,
  tsx: jsx,
  bash: shell,
  sh: shell,
};

export function escapeHTML(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Highlights code with twinkleplop. The colors come from the `--syntax-*`
 * variables in styles.css, so they follow the light and dark themes.
 */
export function highlight(code: string, lang: string): string {
  const highlighter = LANGUAGES[lang];
  if (!highlighter) {
    return `<pre class="twinkleplop"><code>${escapeHTML(code)}</code></pre>`;
  }
  return highlighter(code);
}

/** Wraps highlighted code in a frame with a label and a copy button. */
export function codeFrame(html: string, label: string): string {
  return [
    '<div class="code-block">',
    '<div class="code-header">',
    `<span class="code-label">${escapeHTML(label)}</span>`,
    '<button type="button" class="copy-button" data-copy aria-label="Copy code">Copy</button>',
    '</div>',
    html,
    '</div>',
  ].join('');
}
