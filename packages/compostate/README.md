# compostate

> Composable and reactive state management library, inspired by Vue

[![NPM](https://img.shields.io/npm/v/compostate.svg)](https://www.npmjs.com/package/compostate) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --save compostate
```

```bash
yarn add compostate
```

## Usage

```tsx
import { ref, computed, effect } from 'compostate';

// Create our state
const counter = ref(0);

// Subscribe to state changes
effect(() => {
  console.log(counter.value);
});

counter.value += 10; // logs 10

// Derive state from other state
const derived = computed(() => counter.value * 2);

// Subscribe to derived state
effect(() => {
  console.log('Derived:', derived.value);
});

// Update parent state
counter.value += 10 // logs 20 then "Derived: 40"

// Subscribe to both states
effect(() => {
  console.log('Original:', counter.value);
  console.log('Derived:', derived.value)
});
```

## Features

### Reactivity

### Batching

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
