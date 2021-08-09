/* eslint-disable no-param-reassign */
export function insert(
  parent: Node,
  child: Node,
  marker: Node | null = null,
): void {
  parent.insertBefore(child, marker);
}

export function replace(
  parent: Node,
  child: Node,
  marker: Node,
): void {
  parent.replaceChild(child, marker);
}

export function append(
  parent: Node,
  child: Node,
): void {
  parent.appendChild(child);
}

export function remove(
  node: Node,
): void {
  node.parentNode?.removeChild(node);
}

export function createText(value: string): Node {
  return document.createTextNode(value);
}

let id = 0;

const USE_COMMENT = false;

export function createMarker(): Node {
  const newID = id;
  id += 1;
  return USE_COMMENT ? document.createComment(`${newID}`) : createText('');
}

function setAttributeSafe(el: Element, attribute: string, value: string | null): void {
  if (value == null) {
    el.removeAttribute(attribute);
  } else if (value !== el.getAttribute(value)) {
    el.setAttribute(attribute, value);
  }
}

export function setAttribute(el: Element, attribute: string, value: string | null): void {
  const prototype = Object.getPrototypeOf(el);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, attribute);

  if (attribute === 'className') {
    setAttributeSafe(el, 'class', value);
  } else if (attribute === 'textContent') {
    el.textContent = value;
  } else if (attribute === 'innerHTML') {
    el.innerHTML = value ?? '';
  } else if (descriptor && descriptor.set) {
    (el as Record<string, any>)[attribute] = value;
  } else {
    setAttributeSafe(el, attribute, value);
  }
}

export function registerEvent<E extends Element>(
  el: E,
  name: string,
  handler: <Ev extends Event>(ev: Ev) => void,
): () => void {
  // Extract event name
  const event = name.substring(2).toLowerCase();
  // Check if event name ends with 'capture'
  const capture = event.endsWith('capture');
  // Capture actual DOM event
  const actualEvent = event.substring(
    0,
    event.length - (capture ? 7 : 0),
  );

  // Register
  el.addEventListener(actualEvent, handler, {
    capture,
  });

  // Unregister
  return () => {
    el.removeEventListener(actualEvent, handler, {
      capture,
    });
  };
}
