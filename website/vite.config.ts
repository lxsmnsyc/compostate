import path from 'node:path';
import solid from '@solidjs/vite-plugin';
import { defineConfig } from 'vite';
import content from './plugins/content.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

export default defineConfig({
  plugins: [content(ROOT), solid()],
  server: {
    fs: {
      // The header reads the library's version from the workspace.
      allow: [ROOT],
    },
  },
});
