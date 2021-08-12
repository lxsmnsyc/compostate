import {
  batchCleanup,
  createRoot,
} from 'compostate';
import {
  effect,
} from './lib';
import {
  Properties,
  ChildProperties,
  Aliases,
  PropAliases,
  SVGNamespace,
  DelegatedEvents,
} from './constants';
import reconcileArrays from './reconcile';

export {
  Properties,
  ChildProperties,
  PropAliases,
  Aliases,
  SVGElements,
  SVGNamespace,
  DelegatedEvents,
} from './constants';

// eslint-disable-next-line @typescript-eslint/unbound-method
const {
  defineProperty,
  keys,
  getOwnPropertyDescriptors,
  defineProperties,
} = Object;

const $$EVENTS = '_$DX_DELEGATE';

type DefaultEventHandler = <T extends Event>(e: T) => void;
type DataEventHandler = <R, T extends Event>(d: R, e: T) => void;

type SpecialEvent = `$$${string}`
type SpecialEventData = `${SpecialEvent}Data`;
type SpecialEventTarget = Record<SpecialEvent | SpecialEventData, DefaultEventHandler>;

function eventHandler<T extends Event>(e: T) {
  const key: SpecialEvent = `$$${e.type}`;
  let node: SpecialEventTarget & EventTarget = (e.composedPath && e.composedPath()[0]) || e.target;
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
    const handler = node[key] as DefaultEventHandler;
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      if (data != null) {
        handler(data, e);
      } else {
        handler(e);
      }
      if (e.cancelBubble) return;
    }
    node = node.host
      && node.host !== node
      && node.host instanceof Node ? node.host : node.parentNode;
  }
}
interface DocumentWithDelegate extends Document {
  _$DX_DELEGATE?: Set<string>;
}

export function delegateEvents(
  eventNames: string[],
  document: DocumentWithDelegate = window.document,
): void {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}

export function clearDelegatedEvents(
  document: DocumentWithDelegate = window.document,
): void {
  const events = document[$$EVENTS];
  if (events) {
    for (const name of events) {
      document.removeEventListener(name, eventHandler);
    }
    delete document[$$EVENTS];
  }
}

export function setAttribute(node: Element, name: string, value: string): void {
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

export function addEventListener(
  node: Element,
  name: string,
  handler: DefaultEventHandler | [DataEventHandler, any],
  delegate: boolean,
): void {
  if (delegate) {
    if (Array.isArray(handler)) {
      const [listener, data] = handler;
      node[`$$${name}`] = listener;
      node[`$$${name}Data`] = data;
    } else {
      node[`$$${name}`] = handler;
    }
  } else if (Array.isArray(handler)) {
    node.addEventListener(name, (e) => handler[0](handler[1], e));
  } else node.addEventListener(name, handler);
}

function toggleClassKey(
  node: Element,
  key: string,
  value: boolean,
): void {
  const classNames = key.trim().split(/\s+/);
  const list = node.classList;
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++) {
    list.toggle(classNames[i], value);
  }
}

export function classList(
  node: Element,
  value: { [k: string]: boolean },
  prev: { [k: string]: boolean } = {},
): { [k: string]: boolean } {
  const classKeys = keys(value);
  const prevKeys = keys(prev);
  let i; let
    len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === 'undefined' || key in value) {
      continue;
    }
    toggleClassKey(node, key, false);
    delete prev[key];
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i];
    const classValue = !!value[key];
    if (!key || key === 'undefined' || prev[key] === classValue) {
      continue;
    }
    toggleClassKey(node, key, classValue);
    prev[key] = classValue;
  }
  return prev;
}
export function style(
  node: HTMLElement,
  value: { [k: string]: string } | string,
  prev: { [k: string]: string } | string = {},
): { [k: string]: string } | string {
  const nodeStyle = node.style;
  if (typeof value === 'string') {
    nodeStyle.cssText = value;
    return value;
  }
  if (typeof prev === 'string') {
    prev = {};
  }
  const prevKeys = keys(prev);
  for (let i = 0, len = prevKeys.length, s: string; i < len; i++) {
    s = prevKeys[i];
    if (value[s] == null) {
      nodeStyle.removeProperty(s);
    }
    delete prev[s];
  }
  const newKeys = keys(value);
  for (let i = 0, len = newKeys.length, s: string, v: string; i < len; i++) {
    s = newKeys[i];
    v = value[s];
    if (v !== prev[s]) {
      nodeStyle.setProperty(s, v);
      prev[s] = v;
    }
  }
  return prev;
}

// Internal Functions
function toPropertyName(name: string): string {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}

export function spread(node, accessor, isSVG, skipChildren) {
  if (typeof accessor === 'function') {
    effect((current) => spreadExpression(node, accessor(), current, isSVG, skipChildren));
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

export function dynamicProperty(
  props: unknown,
  key: string,
): unknown {
  const src = props[key];
  defineProperty(props, key, {
    get() {
      return src();
    },
    enumerable: true,
  });
  return props;
}

export function insert<T>(
  parent: MountableElement,
  accessor: (() => T) | T,
  marker?: Node | null,
  initial?: JSX.Element,
): JSX.Element {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== 'function') return insertExpression(parent, accessor, initial, marker);
  effect((current) => insertExpression(parent, accessor(), current, marker), initial);
}

export function assign(node, props, isSVG, skipChildren, prevProps = {}) {
  let isCE; let isProp; let
    isChildProp;
  for (const prop in props) {
    if (prop === 'children') {
      if (!skipChildren) insertExpression(node, props.children);
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
    prevProps[prop] = value;
  }
}

// Hydrate
export function hydrate(code: () => JSX.Element, element: MountableElement): () => void {
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

export function gatherHydratable(element: Element): void {
  const templates = element.querySelectorAll('*[data-hk]');
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    sharedConfig.registry.set(node.getAttribute('data-hk'), node);
  }
}

export function getNextElement(template: HTMLTemplateElement): Node {
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

export function getNextMarker(start: Node): [Node, Array<Node>] {
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

function appendNodes(
  parent: Node,
  array: Node[],
  marker: Node | null,
) {
  for (let i = 0, len = array.length; i < len; i++) {
    parent.insertBefore(array[i], marker);
  }
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
        if (!inserted && !i) isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
        else isParent && parent.removeChild(el);
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
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

function insertExpression(parent, value, current, marker, unwrapArray) {
  while (typeof current === 'function') current = current();
  if (value === current) return current;
  const t = typeof value;
  const multi = marker !== undefined;
  parent = (multi && current[0] && current[0].parentNode) || parent;

  if (t === 'string' || t === 'number') {
    if (t === 'number') value = value.toString();
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data = value;
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else if (current !== '' && typeof current === 'string') {
      current = parent.firstChild.data = value;
    } else current = parent.textContent = value;
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
    } else if (Array.isArray(current)) {
      if (current.length === 0) {
        appendNodes(parent, array, marker);
      } else reconcileArrays(parent, current, array);
    } else if (current == null || current === '') {
      appendNodes(parent, array);
    } else {
      reconcileArrays(parent, (multi && current) || [parent.firstChild], array);
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

function spreadExpression(node, props, prevProps = {}, isSVG, skipChildren) {
  if (!skipChildren && 'children' in props) {
    effect(() => (prevProps.children = insertExpression(node, props.children, prevProps.children)));
  }
  effect(() => assign(node, props, isSVG, true, prevProps));
  return prevProps;
}

export function getHydrationKey(): string {
  const hydrate = sharedConfig.context;
  return `${hydrate.id}${hydrate.count++}`;
}

// Components
export function HydrationScript() {

}

export function NoHydration(props) {
  return sharedConfig.context ? undefined : props.children;
}

type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;

export function spread<T>(
  node: Element,
  accessor: (() => T) | T,
  isSVG?: Boolean,
  skipChildren?: Boolean
): void;
export function assign(node: Element, props: any, isSVG?: Boolean, skipChildren?: Boolean): void;

export function getOwner(): unknown;
export function mergeProps(target: unknown, ...sources: unknown[]): unknown;

export function render(
  code: () => JSX.Element,
  element: MountableElement,
): () => void {
  return createRoot(() => batchCleanup(() => {
    insert(element, code(), element.firstChild ? null : undefined);
  }));
}

export function template(
  html: string,
  check: number,
  isSVG?: boolean,
): Element {
  const t = document.createElement('template');
  t.innerHTML = html;
  if (check && t.innerHTML.split('<').length - 1 !== check) {
    throw new Error(`The browser resolved template HTML does not match JSX input:\n${t.innerHTML}\n\n${html}. Is your HTML properly formed?`);
  }
  const result = t.content.firstChild;
  const node = isSVG ? result?.firstChild : result;
  if (node) {
    return node as Element;
  }
  throw new Error('Malformed template');
}
