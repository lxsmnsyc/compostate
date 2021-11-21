import {
  batchCleanup,
  Cleanup,
  computation,
  createRoot,
  onCleanup,
} from 'compostate';
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
import { JSX } from './jsx';

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
  defineProperty,
  defineProperties,
  getOwnPropertyDescriptors,
} = Object;

export { Assets as HydrationScript };

type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;

// declare function addEventListener(
//   node: Element,
//   name: string,
//   handler: () => void,
//   delegate: boolean,
// ): void;
// declare function classList(
//   node: Element,
//   value: { [k: string]: boolean },
//   prev?: { [k: string]: boolean }
// ): void;
// declare function style(
//   node: Element,
//   value: { [k: string]: string },
//   prev?: { [k: string]: string }
// ): void;
// declare function getOwner(): unknown;
// declare function mergeProps(target: unknown, ...sources: unknown[]): unknown;
// declare function dynamicProperty(props: unknown, key: string): unknown;

// declare function hydrate(fn: () => JSX.Element, node: MountableElement): () => void;
// declare function gatherHydratable(node: Element): void;
// declare function getHydrationKey(): string;
// declare function getNextElement(el?: HTMLTemplateElement): Element;
// declare function getNextMatch(start: Node, elementName: string): Element;
// declare function getNextMarker(start: Node): [Node, Array<Node>];
// declare function Assets(props: { children?: JSX.Element }): JSX.Element;
// declare function HydrationScript(): JSX.Element;
// declare function NoHydration(props: { children?: JSX.Element }): JSX.Element;

const $$EVENTS = '_$DX_DELEGATE';

interface DocumentWithDelegatedEvents extends Document {
  _$DX_DELEGATE?: Set<string>;
}

function eventHandler(e) {
  const key = `$$${e.type}`;
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

  while (node !== null) {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== undefined ? handler(data, e) : handler(e);
      if (e.cancelBubble) return;
    }
    node =      node.host && node.host !== node && node.host instanceof Node ? node.host : node.parentNode;
  }
}

export function delegateEvents(
  eventNames: string[],
  document: DocumentWithDelegatedEvents = window.document,
): void {
  let e = document[$$EVENTS];
  if (e == null) {
    e = new Set();
    document[$$EVENTS] = e;
  }
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}

export function clearDelegatedEvents(
  document: DocumentWithDelegatedEvents = window.document,
): void {
  const collection = document[$$EVENTS];
  if (collection) {
    for (const name of collection.keys()) {
      document.removeEventListener(name, eventHandler);
    }
    delete document[$$EVENTS];
  }
}

type DefaultEventHandler = <E extends Event>(e: E) => void;
type SpecialEventHandler = [<T, E extends Event>(data: T, e: E) => void, any];

export function addEventListener(
  node: Element,
  name: string,
  handler: DefaultEventHandler | SpecialEventHandler,
  delegate: boolean,
): void {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    node.addEventListener(name, e => handler[0](handler[1], e));
  } else node.addEventListener(name, handler);
}

export function setAttribute(
  node: Element,
  name: string,
  value: string,
): void {
  if (value == null) {
    node.removeAttribute(name);
  } else {
    node.setAttribute(name, value);
  }
}

export function setAttributeNS(
  node: Element,
  namespace: string,
  name: string,
  value: string,
): void {
  if (value == null) {
    node.removeAttributeNS(namespace, name);
  } else {
    node.setAttributeNS(namespace, name, value);
  }
}

export function classList(node, value, prev = {}) {
  const classKeys = Object.keys(value || {}),
    prevKeys = Object.keys(prev);
  let i, len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === "undefined" || value[key]) continue;
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
    toggleClassKey(node, key, true);
    prev[key] = classValue;
  }
  return prev;
}

export function style(node, value, prev = {}) {
  const nodeStyle = node.style;
  if (value == null || typeof value === "string") return (nodeStyle.cssText = value);
  typeof prev === "string" && (prev = {});
  let v, s;
  for (s in prev) {
    value[s] == null && nodeStyle.removeProperty(s);
    delete prev[s];
  }
  for (s in value) {
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}

export function mergeProps(...sources) {
  const target = {};
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    if (typeof source === "function") source = source();
    const descriptors = getOwnPropertyDescriptors(source);
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

// Internal Functions
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}

function toggleClassKey(node: Element, key: string, value: boolean) {
  const classNames = key.trim().split(/\s+/);
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++) {
    node.classList.toggle(classNames[i], value);
  }
}

function appendNodes(
  parent: MountableElement,
  array: Node[],
  marker: Node | null = null,
) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}

function normalizeIncomingArray(
  normalized: JSX.Element[],
  array: JSX.Element[],
  unwrap?: boolean,
): boolean {
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
        while (typeof item === 'function') item = item();
        dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else normalized.push(document.createTextNode(item.toString()));
  }
  return dynamic;
}

function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return (parent.textContent = '');
  const node = replacement || document.createTextNode('');
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i) { isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker); } else isParent && parent.removeChild(el);
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
}

function insertExpression(
  parent: MountableElement,
  value: (() => JSX.Element) | JSX.Element,
  current: (() => JSX.Element) | JSX.Element,
  marker?: Node | null,
  unwrapArray?: boolean,
): JSX.Element {
  while (typeof current === 'function') current = current();
  if (value === current) return current;
  const t = typeof value,
    multi = marker !== undefined;
  parent = (multi && current[0] && current[0].parentNode) || parent;

  if (t === 'string' || t === 'number') {
    if (t === 'number') value = value.toString();
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data = value;
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== '' && typeof current === 'string') {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === 'boolean') {
    if (sharedConfig.context) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === 'function') {
    effect(() => {
      let v = value();
      while (typeof v === 'function') v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    if (normalizeIncomingArray(array, value, unwrapArray)) {
      effect(() => (current = insertExpression(parent, array, current, marker, true)));
      return () => current;
    }
    if (sharedConfig.context && current && current.length) return current;
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else {
      if (Array.isArray(current)) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else reconcileArrays(parent, current, array);
      } else if (current == null || current === '') {
        appendNodes(parent, array);
      } else {
        reconcileArrays(parent, (multi && current) || [parent.firstChild], array);
      }
    }
    current = array;
  } else if (value instanceof Node) {
    if (Array.isArray(current)) {
      if (multi) return (current = cleanChildren(parent, current, marker, value));
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === '' || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else if ('_DX_DEV_') console.warn('Unrecognized value. Skipped inserting', value);

  return current;
}


function assignProp(node, prop, value, prev, isSVG) {
  let isCE, isProp, isChildProp;
  if (prop === 'style') return style(node, value, prev);
  if (prop === 'classList') return classList(node, value, prev);
  if (value === prev) return prev;
  if (prop === 'ref') {
    value(node);
  } else if (prop.slice(0, 3) === 'on:') {
    node.addEventListener(prop.slice(3), value);
  } else if (prop.slice(0, 10) === 'oncapture:') {
    node.addEventListener(prop.slice(10), value, true);
  } else if (prop.slice(0, 2) === 'on') {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    addEventListener(node, name, value, delegate);
    delegate && delegateEvents([name]);
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
  return value;
}

export function assign(
  node: Element,
  props: any,
  isSVG?: boolean,
  skipChildren?: boolean,
  prevProps = {},
): void {
  for (const prop in prevProps) {
    if (!(prop in props)) {
      if (prop === 'children') continue;
      assignProp(node, prop, null, prevProps[prop], isSVG);
    }
  }
  for (const prop in props) {
    if (prop === 'children') {
      if (!skipChildren) insertExpression(node, props.children);
      continue;
    }
    const value = props[prop];
    prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG);
  }
}

function spreadExpression(
  node: Element,
  props: any,
  prevProps = {},
  isSVG?: boolean,
  skipChildren?: boolean,
): any {
  if (!skipChildren && "children" in props) {
    computation(() => (prevProps.children = insertExpression(node, props.children, prevProps.children)));
  }
  computation(() => assign(node, props, isSVG, true, prevProps));
  return prevProps;
}

export function spread<T>(
  node: Element,
  accessor: (() => T) | T,
  isSVG?: boolean,
  skipChildren?: boolean,
): void {
  if (typeof accessor === "function") {
    computation(current => spreadExpression(node, accessor(), current, isSVG, skipChildren));
  } else spreadExpression(node, accessor, undefined, isSVG, skipChildren);
}

export function insert(
  parent: MountableElement,
  accessor: (() => JSX.Element) | JSX.Element,
  marker?: Node | null,
  initial: JSX.Element = null,
): void {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  computation(current => insertExpression(parent, accessor(), current, marker), initial);
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

// Hydrate
export function hydrate(code, element) {
  sharedConfig.resources = globalThis._$HYDRATION.resources;
  sharedConfig.completed = globalThis._$HYDRATION.completed;
  sharedConfig.events = globalThis._$HYDRATION.events;
  sharedConfig.context = {
    id: "",
    count: 0,
    loadResource: globalThis._$HYDRATION.loadResource
  };
  sharedConfig.registry = new Map();
  gatherHydratable(element);
  const dispose = render(code, element, [...element.childNodes]);
  sharedConfig.context = null;
  return dispose;
}

export function gatherHydratable(element) {
  const templates = element.querySelectorAll(`*[data-hk]`);
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    sharedConfig.registry.set(node.getAttribute("data-hk"), node);
  }
}

export function getNextElement(template) {
  let node, key;
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
  let end = start,
    count = 0,
    current = [];
  if (sharedConfig.context) {
    while (end) {
      if (end.nodeType === 8) {
        const v = end.nodeValue;
        if (v === "#") count++;
        else if (v === "/") {
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

export function render(
  code: () => JSX.Element,
  element: MountableElement,
  init: any,
): Cleanup {
  return createRoot(() => batchCleanup(() => {
    insert(element, code(), element.firstChild ? null : undefined, init);
    onCleanup(() => {
      element.textContent = '';
    });
  }));
}

export function template(
  html: string,
  check: number,
  isSVG?: boolean,
): Element {
  const t = document.createElement('template');
  if (process.env.NODE_ENV !== 'production' && check && html.split('<').length - 1 !== check) {
    throw new Error(`The browser resolved template HTML does not match JSX input:\n${t.innerHTML}\n\n${html}. Is your HTML properly formed?`);
  }
  t.innerHTML = html;
  const result = t.content.firstChild;
  const node = isSVG ? result?.firstChild : result;
  if (node == null) {
    throw new Error('Malformed template');
  }
  return node as Element;
}
