/* eslint-disable no-continue */
/* eslint-disable no-param-reassign */
type Operations =
  | 'delete'
  | 'insert'
  | 'noop'
  | 'replace';

function equal<T>(a: T, b: T): boolean {
  return Object.is(a, b);
}

export default function diff<T>(original: T[], target: T[]): Operations[] {
  const originalLength = original.length;
  const targetLength = target.length;
  const moda = new Int8Array(originalLength);
  const modb = new Int8Array(targetLength);
  const up: Record<number, number> = {};
  const down: Record<number, number> = {};

  const snake = (so: number, eo: number, st: number, et: number) => {
    const N = eo - so;
    const M = et - st;
    const kdn = so - st;
    const kup = eo - et;
    const delta = N - M;
    const deltaOdd = delta % 2;
    const Dmax = (N + M + 1) / 2;
    down[kdn + 1] = so;
    up[kup - 1] = eo;
    for (let D = 0; D <= Dmax; D += 1) {
      let k = 0; let x = 0; let
        y = 0;
      // forward path
      for (k = kdn - D; k <= kdn + D; k += 2) {
        if (k === kdn - D) x = down[k + 1]; // down
        else {
          x = down[k - 1] + 1; // right
          if ((k < kdn + D) && (x <= down[k + 1])) x = down[k + 1]; // down
        }
        y = x - k;
        // diagonal
        while (x < eo && y < et && equal(original[x], target[y])) {
          x += 1;
          y += 1;
        }
        down[k] = x;
        if (deltaOdd && (kup - D < k) && (k < kup + D) && up[k] <= down[k]) {
          return [down[k], down[k] - k, up[k], up[k] - k];
        }
      }
      // reverse path
      for (k = kup - D; k <= kup + D; k += 2) {
        if (k === kup + D) x = up[k - 1]; // up
        else {
          x = up[k + 1] - 1; // left
          if ((k > kup - D) && (up[k - 1] < x)) x = up[k - 1]; // up
        }
        y = x - k;
        // diagonal
        while (x > so && y > st && equal(original[x - 1], target[y - 1])) {
          x += 1;
          y += 1;
        }
        up[k] = x;
        if (!deltaOdd && (kdn - D <= k) && (k <= kdn + D) && up[k] <= down[k]) {
          return [down[k], down[k] - k, up[k], up[k] - k];
        }
      }
    }

    throw new Error('failed snake');
  };

  const lcs = (so: number, eo: number, st: number, et: number) => {
    // separate common head
    while (so < eo && st < et && equal(original[so], target[st])) {
      so += 1;
      st += 1;
    }
    // separate common tail
    while (so < eo && st < et && equal(original[eo - 1], target[et - 1])) {
      eo -= 1;
      et -= 1;
    }
    if (so === eo) {
      // only insertions
      while (st < et) {
        modb[st] = 1;
        st += 1;
      }
    } else if (et === st) {
      // only deletions
      while (so < eo) {
        moda[so] = 1;
        so += 1;
      }
    } else {
      // no destructuring due Babel bloat
      const path = snake(so, eo, st, et);
      if (path) {
        lcs(so, path[0], st, path[1]);
        lcs(path[2], eo, path[3], et);
      }
    }
  };
  const changes: Operations[] = [];
  let so = 0;
  let st = 0;
  lcs(so, originalLength, st, targetLength);
  while (so < originalLength || st < targetLength) {
    if (so < originalLength && st < targetLength) {
      if (!moda[so] && !modb[st]) {
        changes.push('noop');
        so += 1;
        st += 1;
        continue;
      } else if (moda[so] && modb[st]) {
        changes.push('replace');
        so += 1;
        st += 1;
        continue;
      }
    }
    if (so < originalLength && (targetLength <= st || moda[so])) {
      changes.push('delete');
      so += 1;
    }
    if (st < targetLength && (originalLength <= so || modb[st])) {
      changes.push('insert');
      st += 1;
    }
  }
  return changes;
}
