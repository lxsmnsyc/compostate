import Context from './context';
import {
  createLinkedList,
  createLinkedListNode,
  insertTail,
  LinkedList,
  removeNode,
} from './linked-list';

function transformDOM(root: HTMLElement): LinkedList<Element> {
  const list = createLinkedList<Element>();

  function traverse(current: Element): void {
    let node = current.firstElementChild;

    while (node) {
      const newNode = createLinkedListNode(node.cloneNode(false));
      insertTail(list, newNode);
      traverse(node);
      const next = node.nextElementSibling;
      current.removeChild(node);
      node = next;
    }
  }

  traverse(root);

  let node = list.head;

  while (node) {
    node = node.next;
  }

  return list;
}

export function createHydration(root: HTMLElement): LinkedList<Element> {
  return transformDOM(root);
}

export function claimHydration(hydration: LinkedList<Element>): Element | null {
  const node = hydration.head;
  if (node) {
    removeNode(hydration, node);
  }
  return node?.value ?? null;
}

export const HYDRATION = new Context<LinkedList<Element>>();
