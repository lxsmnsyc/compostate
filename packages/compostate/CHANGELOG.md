# compostate

## 1.0.1

### Patch Changes

- 8698724: Updates propagate faster, from 1.5x to 38x on the included benchmarks. Dependencies are now kept between runs instead of being removed and added again.

  This also fixes these bugs:

  - A computed that reads an atom directly and through another computed now recomputes when the other computed's value stays the same.
  - An effect now runs once per write when it reads several computeds that share a source.
  - Long chains of computeds read by an effect no longer overflow the stack.
  - An effect that reruns itself now runs the cleanups of every earlier run.

- ae71854: Reactive nodes use less memory and update faster when their dependencies change. Each atom, computed and effect group takes about 25% less memory, and effects whose dependencies change between runs update about 2x faster.

## 1.0.0

### Major Changes

- d842685: The React, Preact and custom element bindings now ship inside `compostate` as subpath exports.

  - Import from `compostate/react`, `compostate/preact` and `compostate/element`.
  - The `react-compostate`, `preact-compostate` and `compostate-element` packages are discontinued.
  - React and Preact are optional peer dependencies, so install only the one you use.
  - The bindings no longer depend on `@lyonph/react-hooks` or `@lyonph/preact-hooks`.

  `effect` and `deferred` now run. Their idle queue is drained by `requestIdleCallback` when the host provides one, and by a macro task otherwise. The new `flushIdle` export drains the queue synchronously, which is what tests and server rendering need.

  `waitForAll`, `waitForAny` and `waitForRace` now report the pending request correctly instead of throwing a `ResourceNotReadyError` with no promise. `waitForAll` and `waitForAny` also prefer suspending over reporting a failure while another signal is still pending.

  The 0.x reactive object API is gone. `reactive`, `ref`, `computedRef`, `readonly`, `template`, `map`, `index` and `debounced` have been replaced by `atom`, `signal`, `computed`, `deferred` and `resource`.
