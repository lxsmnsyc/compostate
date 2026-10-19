/** Finds an element the demo's own markup is known to contain. */
export function query<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`The demo markup has no ${selector}.`);
  }
  return element;
}

/** Appends a line to a demo's log and keeps the newest one in view. */
export function log(list: HTMLElement, message: string): void {
  const item = document.createElement('li');
  item.textContent = message;
  list.append(item);
  list.scrollTop = list.scrollHeight;
}
