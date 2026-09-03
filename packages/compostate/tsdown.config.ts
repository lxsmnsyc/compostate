import { defineConfig } from 'tsdown';

const ENTRY = {
  index: './src/index.ts',
  react: './src/react/index.ts',
  preact: './src/preact/index.ts',
  element: './src/element/index.ts',
};

export default defineConfig([
  {
    entry: ENTRY,
    platform: 'neutral',
    dts: true,
    outDir: './dist/dev',
    format: ['esm', 'cjs'],
    env: {
      PROD: false,
    },
  },
  {
    entry: ENTRY,
    platform: 'neutral',
    dts: true,
    format: ['esm', 'cjs'],
    env: {
      PROD: true,
    },
  },
]);
