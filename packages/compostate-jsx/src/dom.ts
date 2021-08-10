import { batch, untrack } from 'compostate';

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

export function createFragment(): Node {
  return document.createDocumentFragment();
}

export function createText(value: string): Node {
  return document.createTextNode(value);
}

let id = 0;

const USE_COMMENT = false;

export const createMarker = USE_COMMENT
  ? () => document.createComment(`${id++}`)
  : () => createText('');

function setAttributeSafe(el: Element, attribute: string, value: string | null): void {
  if (value == null) {
    el.removeAttribute(attribute);
  } else {
    el.setAttribute(attribute, value);
  }
}

const domAttributes = new Set([
  'accept',
  'acceptCharset',
  'action',
  'allowFullScreen',
  'allowTransparency',
  'alt',
  'as',
  'async',
  'autoComplete',
  'autoFocus',
  'autoPlay',
  'capture',
  'cellPadding',
  'cellSpacing',
  'charSet',
  'challenge',
  'checked',
  'cite',
  'classID',
  'cols',
  'colSpan',
  'content',
  'controls',
  'coords',
  'crossOrigin',
  'data',
  'dateTime',
  'default',
  'defer',
  'disabled',
  'download',
  'encType',
  'form',
  'formAction',
  'formEncType',
  'formMethod',
  'formNoValidate',
  'formTarget',
  'frameBorder',
  'headers',
  'height',
  'high',
  'href',
  'hrefLang',
  'htmlFor',
  'httpEquiv',
  'integrity',
  'keyParams',
  'keyType',
  'kind',
  'label',
  'list',
  'loop',
  'low',
  'manifest',
  'marginHeight',
  'marginWidth',
  'max',
  'maxLength',
  'media',
  'mediaGroup',
  'method',
  'min',
  'minLength',
  'multiple',
  'muted',
  'name',
  'nonce',
  'noValidate',
  'open',
  'optimum',
  'pattern',
  'placeholder',
  'playsInline',
  'poster',
  'preload',
  'readOnly',
  'rel',
  'required',
  'reversed',
  'rows',
  'rowSpan',
  'sandbox',
  'scope',
  'scoped',
  'scrolling',
  'seamless',
  'selected',
  'shape',
  'size',
  'sizes',
  'span',
  'src',
  'srcDoc',
  'srcLang',
  'srcSet',
  'start',
  'step',
  'summary',
  'target',
  'type',
  'useMap',
  'value',
  'width',
  'wmode',
  'wrap',
]);

const aliases: Record<string, string> = {
  className: 'class',
  htmlFor: 'for',
};

const getProto = Object.getPrototypeOf;
const getDescriptor = Object.getOwnPropertyDescriptor;

export function setAttribute(el: Element, attribute: string, value: string | null): void {
  const prototype = getProto(el);
  const descriptor = getDescriptor(prototype, attribute);

  if (attribute in aliases) {
    setAttributeSafe(el, aliases[attribute], value);
  } else if (domAttributes.has(attribute)) {
    el[attribute] = value;
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

function kebabify(str: string): string {
  return str.replace(/([A-Z])([A-Z])/g, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

const objectKeys = Object.keys;

export function createStyle(obj: Record<string, string>): string {
  const keys = objectKeys(obj);
  let value = '';
  for (let i = 0, len = keys.length, prop: string; i < len; i++) {
    prop = keys[i];
    value += `${kebabify(prop)}:${obj[prop]};`;
  }
  return value;
}

// https://github.com/ryansolid/dom-expressions/blob/main/packages/dom-expressions/src/constants.js#L48
const delegatedEvents = new Set([
  'beforeinput',
  'click',
  'dblclick',
  'focusin',
  'focusout',
  'input',
  'keydown',
  'keyup',
  'mousedown',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'pointerdown',
  'pointermove',
  'pointerout',
  'pointerover',
  'pointerup',
  'touchend',
  'touchmove',
  'touchstart',
]);

function getDelegatedEventKey(name: string): string {
  return `_COMPOSTATE_JSX_:${name}`;
}

const $$EVENTS = '_COMPOSTATE_JSX_';

// eslint-disable-next-line @typescript-eslint/unbound-method
const defProp = Object.defineProperty;

function eventHandler<E extends Event>(e: E) {
  const key = getDelegatedEventKey(e.type);
  let node = (e.composedPath && e.composedPath()[0]) || e.target;
  // reverse Shadow DOM retargetting
  if (e.target !== node) {
    defProp(e, 'target', {
      configurable: true,
      value: node,
    });
  }

  // simulate currentTarget
  defProp(e, 'currentTarget', {
    configurable: true,
    get() {
      return node;
    },
  });

  untrack(() => {
    batch(() => {
      while (node !== null) {
        const handler = node[key];
        if (handler && !node.disabled) {
          handler(e);
          if (e.cancelBubble) return;
        }
        node = node.host
          && node.host !== node
          && node.host instanceof Node ? node.host : node.parentNode;
      }
    });
  });
}

function addEventListener(
  node: Node,
  name: string,
  handler: <E extends Event>(event: E) => void,
  delegate: boolean,
) {
  if (delegate) {
    const key = getDelegatedEventKey(name);
    node[key] = handler;
    return () => {
      node[key] = undefined;
    };
  }
  const wrappedHandler: typeof handler = (evt) => (
    untrack(() => batch(() => handler(evt)))
  );
  node.addEventListener(name, wrappedHandler);
  return () => {
    node.removeEventListener(name, wrappedHandler);
  };
}

export function delegateEvents(
  eventNames: string,
): void {
  const e: Set<string> = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  if (!e.has(eventNames)) {
    e.add(eventNames);
    document.addEventListener(eventNames, eventHandler);
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
  if (capture) {
    const wrappedHandler: typeof handler = (evt) => (
      untrack(() => batch(() => handler(evt)))
    );
    el.addEventListener(actualEvent, wrappedHandler, {
      capture,
    });
    return () => {
      el.removeEventListener(actualEvent, wrappedHandler, {
        capture,
      });
    };
  }
  const shouldDelegate = delegatedEvents.has(actualEvent);
  const cleanup = addEventListener(el, actualEvent, handler, shouldDelegate);
  if (shouldDelegate) {
    delegateEvents(actualEvent);
  }

  // Unregister
  return cleanup;
}
