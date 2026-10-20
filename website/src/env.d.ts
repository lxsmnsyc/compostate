declare module '*.md' {
  import type { Component } from 'solid-js';

  export const doc: {
    slug: string;
    title: string;
    description: string;
    headings: { depth: number; text: string; id: string }[];
    file: string;
  };
  const Page: Component;
  export default Page;
}

declare module 'virtual:docs-manifest' {
  const manifest: Partial<
    Record<string, { title: string; description: string }>
  >;
  export default manifest;
}

declare module 'virtual:search-index' {
  const entries: {
    id: string;
    slug: string;
    page: string;
    heading: string;
    text: string;
  }[];
  export default entries;
}

declare module 'virtual:showcase' {
  const examples: {
    id: string;
    label: string;
    description: string;
    input: string;
    output: string;
  }[];
  export default examples;
}

/** A demo's source, highlighted at build time. */
declare module 'virtual:demo-source/*' {
  const code: string;
  export default code;
}
