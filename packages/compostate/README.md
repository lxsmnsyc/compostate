# compostate

> Fine-grained reactivity library

[![NPM](https://img.shields.io/npm/v/compostate.svg)](https://www.npmjs.com/package/compostate)

`compostate` is a small reactive core built on atoms, computed values and effects. It ships with bindings for React, Preact and custom elements as subpath exports, so there is only one package to install and one reactive graph at runtime.

## Install

```bash
npm i compostate
```

```bash
yarn add compostate
```

```bash
pnpm add compostate
```

## Usage

```js
import { atom, computed, syncEffect } from 'compostate';

const count = atom(0);
const doubled = computed(() => count() * 2);

syncEffect(() => {
  console.log('Doubled:', doubled());
});

count(1); // Logs 'Doubled: 2'
```

## Entry points

| Import               | What it gives you                                     |
| -------------------- | ----------------------------------------------------- |
| `compostate`         | The reactive core and the concurrency helpers.        |
| `compostate/react`   | `defineComponent` and `useCompostateSetup` for React. |
| `compostate/preact`  | The same bindings for Preact.                         |
| `compostate/element` | `define` and `setRenderer` for custom elements.       |

React and Preact are optional peer dependencies. Install only the one you use.

## Documentation

- [Concepts](https://github.com/lxsmnsyc/compostate/blob/main/docs/concepts.md) explains atoms, effects, cleanups, error boundaries and contexts.
- [Concurrency](https://github.com/lxsmnsyc/compostate/blob/main/docs/concurrency.md) covers resources, suspense and the `waitFor*` helpers.
- [API reference](https://github.com/lxsmnsyc/compostate/blob/main/docs/api.md) lists every export.
- [React and Preact](https://github.com/lxsmnsyc/compostate/blob/main/docs/react.md) covers the component bindings.
- [Custom elements](https://github.com/lxsmnsyc/compostate/blob/main/docs/custom-elements.md) covers the web component binding.

## Examples

- [Custom elements with Vite](https://github.com/lxsmnsyc/compostate/tree/main/examples/compostate-element-vite)
- [React with Vite](https://github.com/lxsmnsyc/compostate/tree/main/examples/react-compostate-vite)
- [Preact with Vite](https://github.com/lxsmnsyc/compostate/tree/main/examples/preact-compostate-vite)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
