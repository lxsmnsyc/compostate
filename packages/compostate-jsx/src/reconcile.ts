export default function reconcileArrays(parentNode: Node, a: Node[], b: Node[]): void {
  const bLength = b.length;
  let aEnd = a.length;
  let bEnd = bLength;
  let aStart = 0;
  let bStart = 0;
  const after = a[aEnd - 1].nextSibling;
  let map = null;

  while (aStart < aEnd || bStart < bEnd) {
    // common prefix
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    // common suffix
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    // append
    if (aEnd === aStart) {
      let node: Node | null;
      if (bEnd < bLength) {
        node = bStart
          ? b[bStart - 1].nextSibling
          : b[bEnd - bStart];
      } else {
        node = after;
      }

      while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
    // remove
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) parentNode.removeChild(a[aStart]);
        aStart++;
      }
    // swap backward
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = a[--aEnd].nextSibling;
      parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
      parentNode.insertBefore(b[--bEnd], node);

      a[aEnd] = b[bEnd];
    // fallback to map
    } else {
      if (!map) {
        map = new Map<Node, number>();
        let i = bStart;

        while (i < bEnd) map.set(b[i], i++);
      }

      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart;
          let sequence = 1;
          let t;

          while (++i < aEnd && i < bEnd) {
            t = map.get(a[i]);
            if (t == null || t !== index + sequence) break;
            sequence++;
          }

          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) parentNode.insertBefore(b[bStart++], node);
          } else parentNode.replaceChild(b[bStart++], a[aStart++]);
        } else aStart++;
      } else parentNode.removeChild(a[aStart++]);
    }
  }
}
