type Operations =
  | 'remove'
  | 'insert'
  | 'keep'

type Frontier = {
  x: number;
  history: Operations[];
}

function diffInternal<T>(original: T[], target: T[]): Operations[] {
  const frontier: Frontier[] = [];
  frontier[1] = {
    x: 0,
    history: [],
  };

  const aMax = original.length;
  const bMax = target.length;

  for (let d = 0; d < aMax + bMax + 1; d += 1) {
    for (let k = -d; k < d + 1; k += 2) {
      const goDown = (k === -d) || (k !== d && frontier[k - 1].x < frontier[k + 1].x);

      let x: number;
      let history: Operations[];

      if (goDown) {
        x = frontier[k + 1].x;
        history = frontier[k + 1].history;
      } else {
        x = frontier[k - 1].x + 1;
        history = frontier[k - 1].history;
      }

      history = history.slice();
      let y = x - k;

      if (y >= 1 && y <= bMax && goDown) {
        history.push('insert');
      } else if (x >= 1 && x <= aMax) {
        history.push('remove');
      }

      while (x < aMax && y < bMax && Object.is(original[x], target[y])) {
        x += 1;
        y += 1;
        history.push('keep');
      }

      if (x >= aMax && y >= bMax) {
        return history;
      }
      frontier[k] = {
        x,
        history,
      };
    }
  }

  throw new Error('diff failed');
}

export default function diff<T>(original: T[], target: T[]): Operations[] {
  return diffInternal(original, target);
}
