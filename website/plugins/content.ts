import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Marked, type Tokens } from 'marked';
import markedFootnote from 'marked-footnote';
import type { Plugin, ViteDevServer } from 'vite';
import { parse as parseYAML } from 'yaml';
import { codeFrame, escapeHTML, highlight } from './highlight.ts';
import { renderShowcase } from './showcase.ts';

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  headings: Heading[];
  /** Path of the source file, relative to the repository root. */
  file: string;
}

/** A page is prose with live demos placed between the runs of it. */
export type RenderedBlock =
  | { type: 'html'; html: string }
  | { type: 'demo'; id: string; title: string; code: string; caption: string };

export interface RenderedDoc extends DocMeta {
  blocks: RenderedBlock[];
}

export interface SearchEntry {
  id: string;
  slug: string;
  page: string;
  heading: string;
  text: string;
}

const LANGUAGE_LABELS: Partial<Record<string, string>> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  bash: 'Terminal',
  sh: 'Terminal',
  text: 'Text',
};

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const DEMO_BLOCK = /^:::demo[ \t]+([\w-]+)[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm;
const ALERT_PATTERN = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/;
const ALERT_MARKER = /^<p>\[!\w+\]\s*/;
const HTML_TAG = /<[^>]+>/g;
const NON_SLUG_CHARACTER = /[^\w\s-]/g;
const WHITESPACE = /\s+/g;
const DASH = /-/g;
const ABSOLUTE_LINK = /^[a-z]+:|^#|^\//i;
const EXTERNAL_LINK = /^https?:/;
const CODE_TITLE = /title="([^"]*)"/;
const HEADING_SPLIT = /<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
const ENTITY = /&(amp|lt|gt|quot|#39);/g;
const ANCHOR_PREFIX = /^#\s*/;
const CODE_HEADER = /<div class="code-header">[\s\S]*?<\/div>/g;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
};

const ALERT_ICONS: Record<string, string> = {
  note: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  tip: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .8 1.6V16h5.6v-.6c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/>',
  important: '<path d="M4 4h16v12H8l-4 4z"/><path d="M12 8v3M12 13.5h.01"/>',
  warning: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  caution:
    '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16h.01"/>',
};

const REPOSITORY = 'https://github.com/lxsmnsyc/compostate/blob/main/';
const DOCS_DIR = 'website/src/content/docs/';
const DEMOS_DIR = path.join(import.meta.dirname, '../src/demos');

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(HTML_TAG, '')
    .replace(NON_SLUG_CHARACTER, '')
    .trim()
    .replace(WHITESPACE, '-');
}

function toText(html: string): string {
  return html
    .replace(CODE_HEADER, ' ')
    .replace(HTML_TAG, ' ')
    .replace(ENTITY, (_, name: string) => ENTITIES[name])
    .replace(WHITESPACE, ' ')
    .trim();
}

/** `cleanup` becomes `Cleanup`, `derived-values` becomes `Derived values`. */
function demoTitle(id: string): string {
  const name = id.replace(DASH, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Demos are plain TypeScript with no framework in them. */
function demoPath(id: string): string {
  return path.join(DEMOS_DIR, `${id}.ts`);
}

// Links between docs point at their pages on the site. Other relative links
// point at the file in the repository.
function rewriteLink(href: string, file: string): string {
  if (ABSOLUTE_LINK.test(href)) {
    return href;
  }
  const [target, hash] = href.split('#');
  if (target === '') {
    return href;
  }
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(file), target),
  );
  const suffix = hash ? `#${hash}` : '';
  if (resolved.startsWith(DOCS_DIR) && resolved.endsWith('.md')) {
    return `/docs/${path.posix.basename(resolved, '.md')}${suffix}`;
  }
  return REPOSITORY + resolved + suffix;
}

interface Frontmatter {
  title: string;
  description: string;
}

function isFrontmatter(value: unknown): value is Frontmatter {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const meta = value as Partial<Record<keyof Frontmatter, unknown>>;
  return (
    typeof meta.title === 'string' &&
    typeof meta.description === 'string' &&
    meta.title !== '' &&
    meta.description !== ''
  );
}

/**
 * One `Marked` per doc, so heading ids stay unique across every run of prose
 * on the page.
 */
function createRenderer(file: string, headings: Heading[]): Marked {
  const used = new Map<string, number>();
  const marked = new Marked({ gfm: true });
  marked.use(markedFootnote());
  marked.use({
    renderer: {
      heading(token: Tokens.Heading) {
        const html = this.parser.parseInline(token.tokens);
        const base = slugify(token.text);
        const count = used.get(base) ?? 0;
        used.set(base, count + 1);
        const id = count ? `${base}-${count}` : base;
        headings.push({ depth: token.depth, text: toText(html), id });
        return `<h${token.depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${html}</h${token.depth}>`;
      },
      code(token: Tokens.Code) {
        const [lang = 'text', ...rest] = (token.lang ?? '').split(WHITESPACE);
        const title = CODE_TITLE.exec(rest.join(' '))?.[1];
        return codeFrame(
          highlight(token.text, lang),
          title ?? LANGUAGE_LABELS[lang] ?? (lang || 'Text'),
        );
      },
      link(token: Tokens.Link) {
        const html = this.parser.parseInline(token.tokens);
        const href = rewriteLink(token.href, file);
        const attributes = EXTERNAL_LINK.test(href)
          ? ' target="_blank" rel="noopener noreferrer"'
          : '';
        return `<a href="${escapeHTML(href)}"${attributes}>${html}</a>`;
      },
      table(token: Tokens.Table) {
        const head = token.header
          .map(cell => `<th>${this.parser.parseInline(cell.tokens)}</th>`)
          .join('');
        const rows = token.rows
          .map(
            row =>
              `<tr>${row.map(cell => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`,
          )
          .join('');
        return `<div class="table-wrapper"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
      },
      blockquote(token: Tokens.Blockquote) {
        const inner = this.parser.parse(token.tokens);
        const alert = ALERT_PATTERN.exec(token.text);
        if (!alert) {
          return `<blockquote>${inner}</blockquote>`;
        }
        const kind = alert[1].toLowerCase();
        const label = kind[0].toUpperCase() + kind.slice(1);
        const icon = `<svg viewBox="0 0 24 24" aria-hidden="true">${ALERT_ICONS[kind]}</svg>`;
        return `<div class="alert alert-${kind}"><p class="alert-title">${icon}${label}</p>${inner.replace(ALERT_MARKER, '<p>')}</div>`;
      },
    },
  });
  return marked;
}

/**
 * Renders a doc into blocks of HTML and demos, with highlighted code,
 * heading anchors, GitHub-style alerts and footnotes. `file` is the path
 * relative to the repository root, used to resolve relative links.
 */
async function renderDoc(source: string, file: string): Promise<RenderedDoc> {
  const match = FRONTMATTER.exec(source);
  if (!match) {
    throw new Error(`${file} has no frontmatter`);
  }
  const meta: unknown = parseYAML(match[1]);
  if (!isFrontmatter(meta)) {
    throw new Error(`${file} needs a title and a description`);
  }
  const body = source.slice(match[0].length);
  const headings: Heading[] = [];
  const marked = createRenderer(file, headings);
  const blocks: RenderedBlock[] = [];

  let cursor = 0;
  for (const found of body.matchAll(DEMO_BLOCK)) {
    const prose = body.slice(cursor, found.index);
    if (prose.trim()) {
      blocks.push({ type: 'html', html: await marked.parse(prose) });
    }
    const id = found[1];
    let demoSource: string;
    try {
      demoSource = await readFile(demoPath(id), 'utf8');
    } catch {
      throw new Error(
        `${file} embeds the demo "${id}", but src/demos/${id}.ts does not exist`,
      );
    }
    const caption = found[2].trim();
    blocks.push({
      type: 'demo',
      id,
      title: demoTitle(id),
      code: highlight(demoSource, 'ts'),
      caption: caption ? await marked.parseInline(caption) : '',
    });
    cursor = found.index + found[0].length;
  }
  const rest = body.slice(cursor);
  if (rest.trim()) {
    blocks.push({ type: 'html', html: await marked.parse(rest) });
  }

  return {
    slug: path.posix.basename(file, '.md'),
    title: meta.title,
    description: meta.description,
    headings,
    file,
    blocks,
  };
}

// Splits a page into one search entry per section.
function createSearchEntries(doc: RenderedDoc): SearchEntry[] {
  const html = doc.blocks
    .map(block =>
      block.type === 'html' ? block.html : `<p>${block.caption}</p>`,
    )
    .join('');
  const parts = html.split(HEADING_SPLIT);
  const entries: SearchEntry[] = [
    {
      id: doc.slug,
      slug: doc.slug,
      page: doc.title,
      heading: doc.title,
      text: `${doc.description} ${toText(parts[0])}`,
    },
  ];
  // `split` with capture groups yields [before, depth, id, heading, body, ...].
  for (let i = 1; i < parts.length; i += 4) {
    entries.push({
      id: `${doc.slug}#${parts[i + 1]}`,
      slug: doc.slug,
      page: doc.title,
      heading: toText(parts[i + 2]).replace(ANCHOR_PREFIX, ''),
      text: toText(parts[i + 3] ?? ''),
    });
  }
  return entries;
}

const MANIFEST_ID = 'virtual:docs-manifest';
const SEARCH_ID = 'virtual:search-index';
const SHOWCASE_ID = 'virtual:showcase';
const DEMO_SOURCE_PREFIX = 'virtual:demo-source/';

/**
 * Serves the docs in `src/content/docs`:
 *
 * - Importing a doc gives `{ doc }` and a default page component. The demos a
 *   doc embeds are static imports of that module.
 * - `virtual:docs-manifest` lists every doc's slug, title and description.
 * - `virtual:search-index` holds the text of every section, for search.
 * - `virtual:showcase` holds the home page examples, run at build time.
 * - `virtual:demo-source/<id>` is a demo's highlighted source.
 */
export default function content(root: string): Plugin {
  const docsDir = path.join(import.meta.dirname, '../src/content/docs');

  function toRelative(file: string): string {
    return path.relative(root, file).split(path.sep).join('/');
  }

  async function loadDocs(): Promise<RenderedDoc[]> {
    const files = (await readdir(docsDir)).filter(name => name.endsWith('.md'));
    return Promise.all(
      files.map(async name => {
        const file = path.join(docsDir, name);
        return renderDoc(await readFile(file, 'utf8'), toRelative(file));
      }),
    );
  }

  let server: ViteDevServer | undefined;

  return {
    name: 'compostate-content',
    enforce: 'pre',
    configureServer(devServer) {
      server = devServer;
      // A change to any doc or demo can change the manifest and the index.
      devServer.watcher.add([docsDir, DEMOS_DIR]);
    },
    handleHotUpdate(context) {
      if (
        server &&
        (context.file.startsWith(docsDir) || context.file.startsWith(DEMOS_DIR))
      ) {
        for (const id of [`\0${MANIFEST_ID}`, `\0${SEARCH_ID}`]) {
          const module = server.moduleGraph.getModuleById(id);
          if (module) {
            server.moduleGraph.invalidateModule(module);
          }
        }
      }
    },
    resolveId(id) {
      if (
        id === MANIFEST_ID ||
        id === SEARCH_ID ||
        id === SHOWCASE_ID ||
        id.startsWith(DEMO_SOURCE_PREFIX)
      ) {
        return `\0${id}`;
      }
      return null;
    },
    async load(id) {
      if (id === `\0${MANIFEST_ID}`) {
        const docs = await loadDocs();
        const manifest = Object.fromEntries(
          docs.map(doc => [
            doc.slug,
            { title: doc.title, description: doc.description },
          ]),
        );
        return `export default ${JSON.stringify(manifest)};`;
      }
      if (id === `\0${SEARCH_ID}`) {
        const docs = await loadDocs();
        return `export default ${JSON.stringify(docs.flatMap(createSearchEntries))};`;
      }
      if (id === `\0${SHOWCASE_ID}`) {
        return `export default ${JSON.stringify(await renderShowcase(root))};`;
      }
      if (id.startsWith(`\0${DEMO_SOURCE_PREFIX}`)) {
        const file = demoPath(id.slice(`\0${DEMO_SOURCE_PREFIX}`.length));
        this.addWatchFile(file);
        return `export default ${JSON.stringify(highlight(await readFile(file, 'utf8'), 'ts'))};`;
      }
      if (!id.endsWith('.md')) {
        return null;
      }

      const doc = await renderDoc(await readFile(id, 'utf8'), toRelative(id));
      const imports = [
        "import { createDocPage } from '/src/components/DocPage';",
      ];
      const blocks = doc.blocks.map((block, index) => {
        if (block.type === 'html') {
          return JSON.stringify(block);
        }
        this.addWatchFile(demoPath(block.id));
        const name = `Demo${index}`;
        imports.push(`import * as ${name} from '/src/demos/${block.id}.ts';`);
        return `{ ...${JSON.stringify(block)}, mount: ${name}.mount }`;
      });
      const meta: DocMeta = {
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        headings: doc.headings,
        file: doc.file,
      };
      // The module imports only from the site's own sources, which resolve
      // their dependencies.
      return [
        ...imports,
        `export const doc = ${JSON.stringify(meta)};`,
        `const blocks = [\n  ${blocks.join(',\n  ')}\n];`,
        'export default createDocPage(doc, blocks);',
      ].join('\n');
    },
  };
}
