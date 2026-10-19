import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspect } from 'node:util';
import { codeFrame, escapeHTML, highlight } from './highlight.ts';

export interface ShowcaseExample {
  id: string;
  label: string;
  description: string;
  input: string;
  output: string;
}

interface Example {
  id: string;
  label: string;
  description: string;
  imports: string[];
  /** Runs as written, with the imports in scope and `console` captured. */
  source: string;
}

const EXAMPLES: Example[] = [
  {
    id: 'computed',
    label: 'Computed',
    description:
      'A computed that returns an equal value stops the update there.',
    imports: ['atom', 'computed', 'syncEffect'],
    source: `const message = atom('Hello');
const length = computed(() => message().length);

syncEffect(() => {
  console.log('Length:', length());
});

message('Aloha'); // still 5 letters
message('Bonjour');`,
  },
  {
    id: 'batch',
    label: 'Batching',
    description: 'Writes inside a batch apply at once, and effects rerun once.',
    imports: ['atom', 'batch', 'syncEffect'],
    source: `const greeting = atom('Hello');
const receiver = atom('Alexis');

syncEffect(() => {
  console.log(\`\${greeting()}, \${receiver()}!\`);
});

batch(() => {
  greeting('Bonjour');
  receiver('Compostate');
});`,
  },
  {
    id: 'cleanup',
    label: 'Cleanups',
    description:
      'Cleanups run before a rerun, and nested effects stop with their parent.',
    imports: ['atom', 'onCleanup', 'syncEffect'],
    source: `const room = atom('general');

const stop = syncEffect(() => {
  const name = room();
  console.log('join', name);
  onCleanup(() => console.log('leave', name));
});

room('random');
stop();`,
  },
];

function format(value: unknown): string {
  return typeof value === 'string' ? value : inspect(value, { colors: false });
}

/**
 * Runs the home page examples against the workspace build of compostate, so
 * the output on the page is what the library produces. The source shown is
 * the source that ran.
 */
export async function renderShowcase(root: string): Promise<ShowcaseExample[]> {
  const entry = path.join(root, 'packages/compostate/dist/index.js');
  const compostate: Record<string, unknown> = await import(
    pathToFileURL(entry).href
  );

  return EXAMPLES.map(example => {
    const lines: string[] = [];
    const capture = {
      log: (...values: unknown[]) => {
        lines.push(values.map(format).join(' '));
      },
    };

    // oxlint-disable-next-line typescript/no-implied-eval, no-new-func -- Runs the example exactly as shown on the page.
    const run = new Function(
      'compostate',
      'console',
      `const { ${example.imports.join(', ')} } = compostate;\n${example.source}`,
    ) as (library: Record<string, unknown>, console: typeof capture) => void;
    run(compostate, capture);

    const input = `import { ${example.imports.join(', ')} } from 'compostate';\n\n${example.source}`;
    const output = lines
      .map(line => `<span class="l">${escapeHTML(line)}</span>`)
      .join('\n');
    return {
      id: example.id,
      label: example.label,
      description: example.description,
      input: codeFrame(highlight(input, 'js'), 'Input'),
      output: codeFrame(
        `<pre class="twinkleplop console-output"><code>${output}</code></pre>`,
        'Console',
      ),
    };
  });
}
