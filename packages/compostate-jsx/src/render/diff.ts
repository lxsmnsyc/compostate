/* eslint-disable no-param-reassign */
import { insert, remove, replace } from '../dom';

// https://github.com/WebReflection/udomdiff/blob/master/esm/index.js
export default function diff(
  parent: Node,
  current: Node[],
  future: Node[],
  before: Node | null,
): void {
  const futureLength = future.length;
  let currentEnd = current.length;
  let futureEnd = futureLength;
  let currentStart = 0;
  let futureStart = 0;
  let map: Map<Node, number> | null = null;

  while (currentStart < currentEnd || futureStart < futureEnd) {
    // append head, tail, or nodes in between: fast path
    if (currentEnd === currentStart) {
      // we could be in a situation where the rest of nodes that
      // need to be added are not at the end, and in such case
      // the node to `insertBefore`, if the index is more than 0
      // must be retrieved, otherwise it's gonna be the first item.
      const marker = futureStart
        ? future[futureStart - 1].nextSibling
        : future[futureEnd - futureStart];
      const node = futureEnd < futureLength ? marker : before;
      while (futureStart < futureEnd) {
        insert(parent, future[futureStart++], node);
      }
    } else if (futureEnd === futureStart) {
      // remove head or tail: fast path
      while (currentStart < currentEnd) {
        // remove the node only if it's unknown or not live
        if (!map || !map.has(current[currentStart])) {
          remove(current[currentStart]);
        }
        currentStart++;
      }
    } else if (current[currentStart] === future[futureStart]) {
      // same node: fast path
      currentStart++;
      futureStart++;
    } else if (current[currentEnd - 1] === future[futureEnd - 1]) {
      // same tail: fast path
      futureEnd--;
      currentEnd--;
    } else if (
      current[currentStart] === future[futureEnd - 1]
      && future[futureStart] === current[currentEnd - 1]
    ) {
      // The once here single last swap "fast path" has been removed in v1.1.0
      // https://github.com/WebReflection/udomdiff/blob/single-final-swap/esm/index.js#L69-L85
      // reverse swap: also fast path
      // this is a "shrink" operation that could happen in these cases:
      // [1, 2, 3, 4, 5]
      // [1, 4, 3, 2, 5]
      // or asymmetric too
      // [1, 2, 3, 4, 5]
      // [1, 2, 3, 5, 6, 4]
      const node = current[--currentEnd].nextSibling;
      insert(parent, future[futureStart++], current[currentStart++]);
      insert(parent, future[--futureEnd], node);
      // mark the future index as identical (yeah, it's dirty, but cheap 👍)
      // The main reason to do this, is that when a[aEnd] will be reached,
      // the loop will likely be on the fast path, as identical to b[bEnd].
      // In the best case scenario, the next loop will skip the tail,
      // but in the worst one, this node will be considered as already
      // processed, bailing out pretty quickly from the map index check
      current[currentEnd] = future[futureEnd];
    } else {
      // the map requires an O(bEnd - bStart) operation once
      // to store all future nodes indexes for later purposes.
      // In the worst case scenario, this is a full O(N) cost,
      // and such scenario happens at least when all nodes are different,
      // but also if both first and last items of the lists are different
      if (!map) {
        map = new Map();
        let i = futureStart;
        while (i < futureEnd) {
          map.set(future[i], i++);
        }
      }
      // if it's a future node, hence it needs some handling
      if (map.has(current[currentStart])) {
        // grab the index of such node, 'cause it might have been processed
        const index = map.get(current[currentStart]);
        // if it's not already processed, look on demand for the next LCS
        if (index != null && futureStart < index && index < futureEnd) {
          let i = currentStart;
          // counts the amount of nodes that are the same in the future
          let sequence = 1;
          while (++i < currentEnd && i < futureEnd && map.get(a[i]) === (index + sequence)) {
            sequence++;
          }
          // effort decision here: if the sequence is longer than replaces
          // needed to reach such sequence, which would brings again this loop
          // to the fast path, prepend the difference before a sequence,
          // and move only the future list index forward, so that aStart
          // and bStart will be aligned again, hence on the fast path.
          // An example considering aStart and bStart are both 0:
          // a: [1, 2, 3, 4]
          // b: [7, 1, 2, 3, 6]
          // this would place 7 before 1 and, from that time on, 1, 2, and 3
          // will be processed at zero cost
          if (sequence > (index - futureStart)) {
            const node = current[currentStart];
            while (futureStart < index) {
              insert(parent, future[futureStart++], node);
            }
          } else {
            replace(parent, future[futureStart++], current[currentStart++]);
            // if the effort wasn't good enough, fallback to a replace,
            // moving both source and target indexes forward, hoping that some
            // similar node will be found later on, to go back to the fast path
          }
        } else {
          // otherwise move the source forward, 'cause there's nothing to do
          currentStart++;
        }
      } else {
        // this node has no meaning in the future list, so it's more than safe
        // to remove it, and check the next live node out instead, meaning
        // that only the live list index should be forwarded
        remove(current[currentStart++]);
      }
    }
  }
}
