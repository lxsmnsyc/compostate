export function insert(
  parent: Node,
  child: Node,
  marker: Node | null = null,
): void {
  if (parent !== child.parentNode) {
    parent.insertBefore(child, marker);
  }
}

export function remove(
  node: Node,
): void {
  node.parentNode?.removeChild(node);
}

export function createText(value: string): Node {
  return document.createTextNode(value);
}

export function createMarker(): Node {
  return createText('');
}
