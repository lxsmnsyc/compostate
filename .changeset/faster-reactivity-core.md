---
'compostate': patch
---

Updates propagate faster, from 1.5x to 38x on the included benchmarks. Dependencies are now kept between runs instead of being removed and added again.

This also fixes these bugs:

- A computed that reads an atom directly and through another computed now recomputes when the other computed's value stays the same.
- An effect now runs once per write when it reads several computeds that share a source.
- Long chains of computeds read by an effect no longer overflow the stack.
- An effect that reruns itself now runs the cleanups of every earlier run.
