export interface SidebarSection {
  title: string;
  /** Doc slugs, which are file names in `src/content/docs` without `.md`. */
  pages: string[];
}

/** The docs in sidebar order. Every doc must be listed here. */
export const SIDEBAR: SidebarSection[] = [
  {
    title: 'Getting started',
    pages: ['introduction', 'quick-start'],
  },
  {
    title: 'Guides',
    pages: ['concepts', 'concurrency'],
  },
  {
    title: 'Bindings',
    pages: ['react', 'custom-elements'],
  },
  {
    title: 'Reference',
    pages: ['api'],
  },
];
