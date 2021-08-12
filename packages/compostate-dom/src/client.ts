import { batchCleanup, computation, createRoot } from 'compostate';
import {
  Properties,
  ChildProperties,
  Aliases,
  PropAliases,
  SVGNamespace,
  DelegatedEvents,
} from './constants';
import reconcileArrays from './reconcile';
import { sharedConfig } from './core';

export {
  Properties,
  ChildProperties,
  PropAliases,
  Aliases,
  SVGElements,
  SVGNamespace,
  DelegatedEvents,
} from './constants';

const {
  keys,
  defineProperty,
  defineProperties,
  getOwnPropertyDescriptors,
} = Object;

export { Assets as HydrationScript };

const $$EVENTS = '_$DX_DELEGATE';

type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;
declare function render(code: () => JSX.Element, element: MountableElement): () => void;
declare function template(html: string, count: number, isSVG?: boolean): Element;
declare function insert<T>(
  parent: MountableElement,
  accessor: (() => T) | T,
  marker?: Node | null,
  init?: JSX.Element
): JSX.Element;
declare function delegateEvents(eventNames: string[], d?: Document): void;
declare function clearDelegatedEvents(d?: Document): void;
declare function spread<T>(
  node: Element,
  accessor: (() => T) | T,
  isSVG?: boolean,
  skipChildren?: boolean
): void;
declare function assign(node: Element, props: any, isSVG?: boolean, skipChildren?: boolean): void;
declare function setAttribute(node: Element, name: string, value: string): void;
declare function setAttributeNS(node: Element, namespace: string, name: string, value: string): void;
declare function addEventListener(
  node: Element,
  name: string,
  handler: () => void,
  delegate: boolean,
): void;
declare function classList(
  node: Element,
  value: { [k: string]: boolean },
  prev?: { [k: string]: boolean }
): void;
declare function style(
  node: Element,
  value: { [k: string]: string },
  prev?: { [k: string]: string }
): void;
declare function getOwner(): unknown;
declare function mergeProps(target: unknown, ...sources: unknown[]): unknown;
declare function dynamicProperty(props: unknown, key: string): unknown;

declare function hydrate(fn: () => JSX.Element, node: MountableElement): () => void;
declare function gatherHydratable(node: Element): void;
declare function getHydrationKey(): string;
declare function getNextElement(el?: HTMLTemplateElement): Element;
declare function getNextMatch(start: Node, elementName: string): Element;
declare function getNextMarker(start: Node): [Node, Array<Node>];
declare function Assets(props: { children?: JSX.Element }): JSX.Element;
declare function HydrationScript(): JSX.Element;
declare function NoHydration(props: { children?: JSX.Element }): JSX.Element;

export function render(code, element, init) {
  return createRoot(() => batchCleanup(() => {
    insert(element, code(), element.firstChild ? null : undefined, init);
    return () => {
      element.textContent = '';
    };
  }));
}

export function template(html, check, isSVG) {
  const t = document.createElement('template');
  t.innerHTML = html;
  if ('_DX_DEV_' && check && t.innerHTML.split('<').length - 1 !== check) {
    throw new Error(`The browser resolved template HTML does not match JSX input:\n${t.innerHTML}\n\n${html}. Is your HTML properly formed?`);
  }
  let node = t.content.firstChild;
  if (isSVG) node = node.firstChild;
  return node;
}

export function delegateEvents(eventNames, document = window.document) {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}

export function clearDelegatedEvents(document = window.document) {
  if (document[$$EVENTS]) {
    for (const name of document[$$EVENTS]) {
      document.removeEventListener(name, eventHandler);
    }
    delete document[$$EVENTS];
  }
}

export function setAttribute(node, name, value) {
  if (value == null) {
    node.removeAttribute(name);
  } else {
    node.setAttribute(name, value);
  }
}

export function setAttributeNS(node, namespace, name, value) {
  if (value == null) {
    node.removeAttributeNS(namespace, name);
  } else {
    node.setAttributeNS(namespace, name, value);
  }
}

export function addEventListener(node, name, handler, delegate) {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else {
      node[`$$${name}`] = handler;
    }
  } else if (Array.isArray(handler)) {
    node.addEventListener(name, (e) => handler[0](handler[1], e));
  } else {
    node.addEventListener(name, handler);
  }
}

export function classList(node, value, prev = {}) {
  const classKeys = keys(value);
  const prevKeys = keys(prev);
  let i; let
    len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === 'undefined' || key in value) continue;
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i];
    const classValue = !!value[key];
    if (!key || key === 'undefined' || prev[key] === classValue) continue;
    toggleClassKey(node, key, classValue);
    prev[key] = classValue;
  }
  return prev;
}

export function style(node, value, prev = {}) {
  const nodeStyle = node.style;
  if (typeof value === 'string') {
    nodeStyle.cssText = value;
    return value;
  }
  if (typeof prev === 'string') {
    prev = {};
  }
  const prevKeys = keys(prev);
  for (let i = 0, len = prevKeys.length, s; i < len; i++) {
    s = prevKeys[i];
    if (value[s] == null) {
      nodeStyle.removeProperty(s);
    }
    delete prev[s];
  }
  const nextKeys = keys(value);
  for (let i = 0, len = nextKeys.length, s, v; i < len; i++) {
    s = nextKeys[i];
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}

export function spread(node, accessor, isSVG, skipChildren) {
  if (typeof accessor === 'function') {
    computation((current) => spreadExpression(node, accessor(), current, isSVG, skipChildren));
  } else spreadExpression(node, accessor, undefined, isSVG, skipChildren);
}

export function mergeProps(...sources) {
  const target = {};
  for (let i = 0; i < sources.length; i++) {
    const descriptors = getOwnPropertyDescriptors(sources[i]);
    defineProperties(target, descriptors);
  }
  return target;
}

export function dynamicProperty(props, key) {
  const src = props[key];
  defineProperty(props, key, {
    get() {
      return src();
    },
    enumerable: true,
  });
  return props;
}

export function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== 'function') {
    insertExpression(parent, accessor, initial, marker);
  } else {
    computation((current) => insertExpression(parent, accessor(), current, marker), initial);
  }
}

export function assign(node, props, isSVG, skipChildren, prevProps = {}) {
  let isCE;
  let isProp;
  let isChildProp;
  const propKeys = keys(props);
  for (let i = 0, len = propKeys.length; i < len; i++) {
    const prop = propKeys[i];
    if (prop === 'children') {
      if (!skipChildren) {
        insertExpression(node, props.children);
      }
      continue;
    }
    const value = props[prop];
    if (value === prevProps[prop]) continue;
    if (prop === 'style') {
      style(node, value, prevProps[prop]);
    } else if (prop === 'classList') {
      classList(node, value, prevProps[prop]);
    } else if (prop === 'ref') {
      value(node);
    } else if (prop.slice(0, 3) === 'on:') {
      node.addEventListener(prop.slice(3), value);
    } else if (prop.slice(0, 10) === 'oncapture:') {
      node.addEventListener(prop.slice(10), value, true);
    } else if (prop.slice(0, 2) === 'on') {
      const name = prop.slice(2).toLowerCase();
      const delegate = DelegatedEvents.has(name);
      addEventListener(node, name, value, delegate);
      if (delegate) {
        delegateEvents([name]);
      }
    } else if (
      (isChildProp = ChildProperties.has(prop))
      || (!isSVG && (PropAliases[prop] || (isProp = Properties.has(prop))))
      || (isCE = node.nodeName.includes('-'))
    ) {
      if (isCE && !isProp && !isChildProp) node[toPropertyName(prop)] = value;
      else node[PropAliases[prop] || prop] = value;
    } else {
      const ns = isSVG && prop.indexOf(':') > -1 && SVGNamespace[prop.split(':')[0]];
      if (ns) setAttributeNS(node, ns, prop, value);
      else setAttribute(node, Aliases[prop] || prop, value);
    }
    prevProps[prop] = value;
  }
}

// Hydrate
export function hydrate(code, element) {
  sharedConfig.resources = globalThis._$HYDRATION.resources;
  sharedConfig.completed = globalThis._$HYDRATION.completed;
  sharedConfig.events = globalThis._$HYDRATION.events;
  sharedConfig.context = {
    id: '',
    count: 0,
    loadResource: globalThis._$HYDRATION.loadResource,
  };
  sharedConfig.registry = new Map();
  gatherHydratable(element);
  const dispose = render(code, element, [...element.childNodes]);
  sharedConfig.context = null;
  return dispose;
}

export function gatherHydratable(element) {
  const templates = element.querySelectorAll('*[data-hk]');
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    sharedConfig.registry.set(node.getAttribute('data-hk'), node);
  }
}

export function getNextElement(template) {
  let node; let
    key;
  if (!sharedConfig.context || !(node = sharedConfig.registry.get((key = getHydrationKey())))) {
    return template.cloneNode(true);
  }
  if (sharedConfig.completed) sharedConfig.completed.add(node);
  sharedConfig.registry.delete(key);
  return node;
}

export function getNextMatch(el, nodeName) {
  while (el && el.localName !== nodeName) el = el.nextSibling;
  return el;
}

export function getNextMarker(start) {
  let end = start;
  let count = 0;
  const current = [];
  if (sharedConfig.context) {
    while (end) {
      if (end.nodeType === 8) {
        const v = end.nodeValue;
        if (v === '#') count++;
        else if (v === '/') {
          if (count === 0) return [end, current];
          count--;
        }
      }
      current.push(end);
      end = end.nextSibling;
    }
  }
  return [end, current];
}

export function runHydrationEvents() {
  if (sharedConfig.events && !sharedConfig.events.queued) {
    queueMicrotask(() => {
      const { completed, events } = sharedConfig;
      events.queued = false;
      while (events.length) {
        const [el, e] = events[0];
        if (!completed.has(el)) return;
        eventHandler(e);
        events.shift();
      }
    });
    sharedConfig.events.queued = true;
  }
}

// Internal Functions
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}

function toggleClassKey(node, key, value) {
  const classNames = key.trim().split(/\s+/);
  const list = node.classList;
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++) {
    list.toggle(classNames[i], value);
  }
}

function eventHandler(e) {
  const key = `$$${e.type}`;
  let node = (e.composedPath && e.composedPath()[0]) || e.target;
  // reverse Shadow DOM retargetting
  if (e.target !== node) {
    defineProperty(e, 'target', {
      configurable: true,
      value: node,
    });
  }

  // simulate currentTarget
  defineProperty(e, 'currentTarget', {
    configurable: true,
    get() {
      return node;
    },
  });

  while (node !== null) {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== undefined ? handler(data, e) : handler(e);
      if (e.cancelBubble) return;
    }
    node = node.host && node.host !== node && node.host instanceof Node ? node.host : node.parentNode;
  }
}

function spreadExpression(node, props, prevProps = {}, isSVG, skipChildren) {
  if (!skipChildren && 'children' in props) {
    computation(() => {
      prevProps.children = insertExpression(node, props.children, prevProps.children);
    });
  }
  computation(() => assign(node, props, isSVG, true, prevProps));
  return prevProps;
}

function insertExpression(parent, value, current, marker, unwrapArray) {
  while (typeof current === 'function') {
    current = current();
  }
  if (value === current) {
    return current;
  }
  const t = typeof value;
  const multi = marker !== undefined;
  parent = (multi && current[0] && current[0].parentNode) || parent;

  if (t === 'string' || t === 'number') {
    if (t === 'number') {
      value = `${value}`;
    }
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data = value;
      } else {
        node = document.createTextNode(value);
      }
      current = cleanChildren(parent, current, marker, node);
    } else if (current !== '' && typeof current === 'string') {
      current = value;
      parent.firstChild.data = value;
    } else {
      current = value;
      parent.textContent = value;
    }
  } else if (value == null || t === 'boolean') {
    if (sharedConfig.context) {
      return current;
    }
    current = cleanChildren(parent, current, marker);
  } else if (t === 'function') {
    computation(() => {
      let v = value();
      while (typeof v === 'function') {
        v = v();
      }
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    if (normalizeIncomingArray(array, value, unwrapArray)) {
      computation(() => {
        current = insertExpression(parent, array, current, marker, true);
      });
      return () => current;
    }
    if (sharedConfig.context && current && current.length) {
      return current;
    }
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) {
        return current;
      }
    } else if (Array.isArray(current)) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else {
        reconcileArrays(parent, current, array);
      }
    } else if (current == null || current === '') {
      appendNodes(parent, array);
    } else {
      reconcileArrays(parent, multi ? current : [parent.firstChild], array);
    }
    current = array;
  } else if (value instanceof Node) {
    if (Array.isArray(current)) {
      if (multi) {
        return cleanChildren(parent, current, marker, value);
      }
      cleanChildren(parent, current, null, value);
    } else {
      const first = parent.firstChild;
      if (current == null || current === '' || !first) {
        parent.appendChild(value);
      } else {
        parent.replaceChild(value, first);
      }
    }
    current = value;
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('Unrecognized value. Skipped inserting', value);
  }

  return current;
}

function normalizeIncomingArray(normalized, array, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i];
    let t;
    if (item instanceof Node) {
      normalized.push(item);
    } else if (item == null || item === true || item === false) {
      // matches null, undefined, true or false
      // skip
    } else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item) || dynamic;
    } else if ((t = typeof item) === 'string') {
      normalized.push(document.createTextNode(item));
    } else if (t === 'function') {
      if (unwrap) {
        while (typeof item === 'function') {
          item = item();
        }
        dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else {
      normalized.push(document.createTextNode(`${item}`));
    }
  }
  return dynamic;
}

function appendNodes(parent, array, marker) {
  for (let i = 0, len = array.length; i < len; i++) {
    parent.insertBefore(array[i], marker);
  }
}

function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) {
    parent.textContent = '';
    return '';
  }
  const node = replacement || document.createTextNode('');
  let i = current.length;
  if (i) {
    let inserted = false;
    i--;
    for (; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i) {
          if (isParent) {
            parent.replaceChild(node, el);
          } else {
            parent.insertBefore(node, marker);
          }
        } else if (isParent) {
          parent.removeChild(el);
        }
      } else {
        inserted = true;
      }
    }
  } else {
    parent.insertBefore(node, marker);
  }
  return [node];
}

export function getHydrationKey() {
  const hydrate = sharedConfig.context;
  return `${hydrate.id}${hydrate.count++}`;
}

// Components
export function Assets() {

}

export function NoHydration(props) {
  return sharedConfig.context ? undefined : props.children;
}
