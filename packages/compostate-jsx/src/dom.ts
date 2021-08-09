import { untrack } from 'compostate';

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

export function setAttribute(el: Element, attribute: string, value: string | null): void {
  const prototype = Object.getPrototypeOf(el);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, attribute);

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

// From https://github.com/facebook/react/blob/main/packages/react-dom/src/events/DOMPluginEventSystem.js#L177-L219
const mediaEventTypes = [
  'abort',
  'canplay',
  'canplaythrough',
  'durationchange',
  'emptied',
  'encrypted',
  'ended',
  'error',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'pause',
  'play',
  'playing',
  'progress',
  'ratechange',
  'seeked',
  'seeking',
  'stalled',
  'suspend',
  'timeupdate',
  'volumechange',
  'waiting',
];

const nonDelegatedEvents = new Set([
  'cancel',
  'close',
  'invalid',
  'load',
  'scroll',
  'toggle',
  // In order to reduce bytes, we insert the above array of media events
  // into this Set. Note: the "error" event isn't an exclusive media event,
  // and can occur on other elements too. Rather than duplicate that event,
  // we just take it from the media events array.
  ...mediaEventTypes,
]);

function getDelegatedEventKey(name: string): string {
  return `_COMPOSTATE_JSX_:${name}`;
}

const $$EVENTS = '_COMPOSTATE_JSX_';

function eventHandler<E extends Event>(e: E) {
  const key = getDelegatedEventKey(e.type);
  let node = (e.composedPath && e.composedPath()[0]) || e.target;
  // reverse Shadow DOM retargetting
  if (e.target !== node) {
    Object.defineProperty(e, 'target', {
      configurable: true,
      value: node,
    });
  }

  // simulate currentTarget
  Object.defineProperty(e, 'currentTarget', {
    configurable: true,
    get() {
      return node;
    },
  });

  untrack(() => {
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
  const wrappedHandler: typeof handler = (evt) => untrack(() => handler(evt));
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
    const wrappedHandler: typeof handler = (evt) => untrack(() => handler(evt));
    el.addEventListener(actualEvent, wrappedHandler, {
      capture,
    });
    return () => {
      el.removeEventListener(actualEvent, wrappedHandler, {
        capture,
      });
    };
  }
  const shouldDelegate = !nonDelegatedEvents.has(actualEvent);
  const cleanup = addEventListener(el, actualEvent, handler, shouldDelegate);
  if (shouldDelegate) {
    delegateEvents(actualEvent);
  }

  // Unregister
  return cleanup;
}
