import { JSX } from './jsx';

export const Aliases: Record<string, string>;
export const PropAliases: Record<string, string>;
export const Properties: Set<string>;
export const ChildProperties: Set<string>;
export const DelegatedEvents: Set<string>;
export const SVGElements: Set<string>;
export const SVGNamespace: Record<string, string>;

type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;
export function render(code: () => JSX.Element, element: MountableElement): () => void;
export function template(html: string, count: number, isSVG?: boolean): Element;
export function insert<T>(
  parent: MountableElement,
  accessor: (() => T) | T,
  marker?: Node | null,
  init?: JSX.Element
): JSX.Element;
export function delegateEvents(eventNames: string[], d?: Document): void;
export function clearDelegatedEvents(d?: Document): void;
export function spread<T>(
  node: Element,
  accessor: (() => T) | T,
  isSVG?: boolean,
  skipChildren?: boolean
): void;
export function assign(node: Element, props: any, isSVG?: boolean, skipChildren?: boolean): void;
export function setAttribute(node: Element, name: string, value: string): void;
export function setAttributeNS(node: Element, namespace: string, name: string, value: string): void;
export function addEventListener(
  node: Element,
  name: string,
  handler: () => void,
  delegate: boolean,
): void;
export function classList(
  node: Element,
  value: { [k: string]: boolean },
  prev?: { [k: string]: boolean }
): void;
export function style(
  node: Element,
  value: { [k: string]: string },
  prev?: { [k: string]: string }
): void;
export function getOwner(): unknown;
export function mergeProps(target: unknown, ...sources: unknown[]): unknown;
export function dynamicProperty(props: unknown, key: string): unknown;

export function hydrate(fn: () => JSX.Element, node: MountableElement): () => void;
export function gatherHydratable(node: Element): void;
export function getHydrationKey(): string;
export function getNextElement(el?: HTMLTemplateElement): Element;
export function getNextMatch(start: Node, elementName: string): Element;
export function getNextMarker(start: Node): [Node, Array<Node>];
export function Assets(props: { children?: JSX.Element }): JSX.Element;
export function HydrationScript(): JSX.Element;
export function NoHydration(props: { children?: JSX.Element }): JSX.Element;
