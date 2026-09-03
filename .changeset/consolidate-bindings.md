---
'compostate': major
---

The React, Preact and custom element bindings now ship inside `compostate` as subpath exports.

- Import from `compostate/react`, `compostate/preact` and `compostate/element`.
- The `react-compostate`, `preact-compostate` and `compostate-element` packages are discontinued.
- React and Preact are optional peer dependencies, so install only the one you use.
- The bindings no longer depend on `@lyonph/react-hooks` or `@lyonph/preact-hooks`.

`effect` and `deferred` now run. Their idle queue is drained by `requestIdleCallback` when the host provides one, and by a macro task otherwise. The new `flushIdle` export drains the queue synchronously, which is what tests and server rendering need.

`waitForAll`, `waitForAny` and `waitForRace` now report the pending request correctly instead of throwing a `ResourceNotReadyError` with no promise. `waitForAll` and `waitForAny` also prefer suspending over reporting a failure while another signal is still pending.

The 0.x reactive object API is gone. `reactive`, `ref`, `computedRef`, `readonly`, `template`, `map`, `index` and `debounced` have been replaced by `atom`, `signal`, `computed`, `deferred` and `resource`.
