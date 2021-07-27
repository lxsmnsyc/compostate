import {
  Reactive,
  RefAttributes,
  VNode,
} from '../types';
import { Booleanish } from './basic';
import { CSSProperties } from './css';
import {
  AriaAttributes,
  AriaRole,
  DOMAttributes,
  DOMFactory,
} from './dom';

export interface HTMLAttributes<RefType extends EventTarget = EventTarget>
  extends AriaAttributes, DOMAttributes<RefType> {
  // Standard HTML Attributes
  accessKey?: string | undefined;
  className?: string | undefined;
  contentEditable?: Booleanish | 'inherit' | undefined;
  contextMenu?: string | undefined;
  dir?: string | undefined;
  draggable?: Booleanish | undefined;
  hidden?: boolean | undefined;
  id?: string | undefined;
  lang?: string | undefined;
  placeholder?: string | undefined;
  slot?: string | undefined;
  spellCheck?: Booleanish | undefined;
  style?: CSSProperties | undefined;
  tabIndex?: number | undefined;
  title?: string | undefined;
  translate?: 'yes' | 'no' | undefined;

  // Unknown
  radioGroup?: string | undefined; // <command>, <menuitem>

  // WAI-ARIA
  role?: AriaRole | undefined;

  // RDFa Attributes
  about?: string | undefined;
  datatype?: string | undefined;
  inlist?: any;
  prefix?: string | undefined;
  property?: string | undefined;
  resource?: string | undefined;
  typeof?: string | undefined;
  vocab?: string | undefined;

  // Non-standard Attributes
  autoCapitalize?: string | undefined;
  autoCorrect?: string | undefined;
  autoSave?: string | undefined;
  color?: string | undefined;
  itemProp?: string | undefined;
  itemScope?: boolean | undefined;
  itemType?: string | undefined;
  itemID?: string | undefined;
  itemRef?: string | undefined;
  results?: number | undefined;
  security?: string | undefined;
  unselectable?: 'on' | 'off' | undefined;

  // Living Standard
  /**
   * Hints at the type of data that might be entered by the user while editing
   * the element or its contents
   * @see https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute
   */
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search' | undefined;
  /**
   * Specify that a standard HTML element should behave like a defined custom built-in element
   * @see https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
   */
  is?: string | undefined;
}

export interface AllHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  // Standard HTML Attributes
  accept?: string | undefined;
  acceptCharset?: string | undefined;
  action?: string | undefined;
  allowFullScreen?: boolean | undefined;
  allowTransparency?: boolean | undefined;
  alt?: string | undefined;
  as?: string | undefined;
  async?: boolean | undefined;
  autoComplete?: string | undefined;
  autoFocus?: boolean | undefined;
  autoPlay?: boolean | undefined;
  capture?: boolean | string | undefined;
  cellPadding?: number | string | undefined;
  cellSpacing?: number | string | undefined;
  charSet?: string | undefined;
  challenge?: string | undefined;
  checked?: boolean | undefined;
  cite?: string | undefined;
  classID?: string | undefined;
  cols?: number | undefined;
  colSpan?: number | undefined;
  content?: string | undefined;
  controls?: boolean | undefined;
  coords?: string | undefined;
  crossOrigin?: string | undefined;
  data?: string | undefined;
  dateTime?: string | undefined;
  default?: boolean | undefined;
  defer?: boolean | undefined;
  disabled?: boolean | undefined;
  download?: any;
  encType?: string | undefined;
  form?: string | undefined;
  formAction?: string | undefined;
  formEncType?: string | undefined;
  formMethod?: string | undefined;
  formNoValidate?: boolean | undefined;
  formTarget?: string | undefined;
  frameBorder?: number | string | undefined;
  headers?: string | undefined;
  height?: number | string | undefined;
  high?: number | undefined;
  href?: string | undefined;
  hrefLang?: string | undefined;
  htmlFor?: string | undefined;
  httpEquiv?: string | undefined;
  integrity?: string | undefined;
  keyParams?: string | undefined;
  keyType?: string | undefined;
  kind?: string | undefined;
  label?: string | undefined;
  list?: string | undefined;
  loop?: boolean | undefined;
  low?: number | undefined;
  manifest?: string | undefined;
  marginHeight?: number | undefined;
  marginWidth?: number | undefined;
  max?: number | string | undefined;
  maxLength?: number | undefined;
  media?: string | undefined;
  mediaGroup?: string | undefined;
  method?: string | undefined;
  min?: number | string | undefined;
  minLength?: number | undefined;
  multiple?: boolean | undefined;
  muted?: boolean | undefined;
  name?: string | undefined;
  nonce?: string | undefined;
  noValidate?: boolean | undefined;
  open?: boolean | undefined;
  optimum?: number | undefined;
  pattern?: string | undefined;
  placeholder?: string | undefined;
  playsInline?: boolean | undefined;
  poster?: string | undefined;
  preload?: string | undefined;
  readOnly?: boolean | undefined;
  rel?: string | undefined;
  required?: boolean | undefined;
  reversed?: boolean | undefined;
  rows?: number | undefined;
  rowSpan?: number | undefined;
  sandbox?: string | undefined;
  scope?: string | undefined;
  scoped?: boolean | undefined;
  scrolling?: string | undefined;
  seamless?: boolean | undefined;
  selected?: boolean | undefined;
  shape?: string | undefined;
  size?: number | undefined;
  sizes?: string | undefined;
  span?: number | undefined;
  src?: string | undefined;
  srcDoc?: string | undefined;
  srcLang?: string | undefined;
  srcSet?: string | undefined;
  start?: number | undefined;
  step?: number | string | undefined;
  summary?: string | undefined;
  target?: string | undefined;
  type?: string | undefined;
  useMap?: string | undefined;
  value?: string | ReadonlyArray<string> | number | undefined;
  width?: number | string | undefined;
  wmode?: string | undefined;
  wrap?: string | undefined;
}

export type HTMLAttributeReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export type HTMLAttributeAnchorTarget =
  | '_self'
  | '_blank'
  | '_parent'
  | '_top'
  // | (string & {});
  | string;

export interface AnchorHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  download?: any;
  href?: string | undefined;
  hrefLang?: string | undefined;
  media?: string | undefined;
  ping?: string | undefined;
  rel?: string | undefined;
  target?: HTMLAttributeAnchorTarget | undefined;
  type?: string | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
}

// export interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}
export type AudioHTMLAttributes<T extends EventTarget> = MediaHTMLAttributes<T>;

export interface AreaHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  alt?: string | undefined;
  coords?: string | undefined;
  download?: any;
  href?: string | undefined;
  hrefLang?: string | undefined;
  media?: string | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  rel?: string | undefined;
  shape?: string | undefined;
  target?: string | undefined;
}

export interface BaseHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  href?: string | undefined;
  target?: string | undefined;
}

export interface BlockquoteHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  cite?: string | undefined;
}

export interface ButtonHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  autoFocus?: boolean | undefined;
  disabled?: boolean | undefined;
  form?: string | undefined;
  formAction?: string | undefined;
  formEncType?: string | undefined;
  formMethod?: string | undefined;
  formNoValidate?: boolean | undefined;
  formTarget?: string | undefined;
  name?: string | undefined;
  type?: 'submit' | 'reset' | 'button' | undefined;
  value?: string | ReadonlyArray<string> | number | undefined;
}

export interface CanvasHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  height?: number | string | undefined;
  width?: number | string | undefined;
}

export interface ColHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  span?: number | undefined;
  width?: number | string | undefined;
}

export interface ColgroupHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  span?: number | undefined;
}

export interface DataHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  value?: string | ReadonlyArray<string> | number | undefined;
}

export interface DetailsHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  open?: boolean | undefined;
}

export interface DelHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  cite?: string | undefined;
  dateTime?: string | undefined;
}

export interface DialogHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  open?: boolean | undefined;
}

export interface EmbedHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  height?: number | string | undefined;
  src?: string | undefined;
  type?: string | undefined;
  width?: number | string | undefined;
}

export interface FieldsetHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  disabled?: boolean | undefined;
  form?: string | undefined;
  name?: string | undefined;
}

export interface FormHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  acceptCharset?: string | undefined;
  action?: string | undefined;
  autoComplete?: string | undefined;
  encType?: string | undefined;
  method?: string | undefined;
  name?: string | undefined;
  noValidate?: boolean | undefined;
  target?: string | undefined;
}

export interface HtmlHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  manifest?: string | undefined;
}

export interface IframeHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  allow?: string | undefined;
  allowFullScreen?: boolean | undefined;
  allowTransparency?: boolean | undefined;
  /** @deprecated */
  frameBorder?: number | string | undefined;
  height?: number | string | undefined;
  loading?: 'eager' | 'lazy' | undefined;
  /** @deprecated */
  marginHeight?: number | undefined;
  /** @deprecated */
  marginWidth?: number | undefined;
  name?: string | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  sandbox?: string | undefined;
  /** @deprecated */
  scrolling?: string | undefined;
  seamless?: boolean | undefined;
  src?: string | undefined;
  srcDoc?: string | undefined;
  width?: number | string | undefined;
}

export interface ImgHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  alt?: string | undefined;
  crossOrigin?: 'anonymous' | 'use-credentials' | '' | undefined;
  decoding?: 'async' | 'auto' | 'sync' | undefined;
  height?: number | string | undefined;
  loading?: 'eager' | 'lazy' | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  sizes?: string | undefined;
  src?: string | undefined;
  srcSet?: string | undefined;
  useMap?: string | undefined;
  width?: number | string | undefined;
}

export interface InsHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  cite?: string | undefined;
  dateTime?: string | undefined;
}

export interface InputHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  accept?: string | undefined;
  alt?: string | undefined;
  autoComplete?: string | undefined;
  autoFocus?: boolean | undefined;
  capture?: boolean | string | undefined;
  // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
  checked?: boolean | undefined;
  crossOrigin?: string | undefined;
  disabled?: boolean | undefined;
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' | undefined;
  form?: string | undefined;
  formAction?: string | undefined;
  formEncType?: string | undefined;
  formMethod?: string | undefined;
  formNoValidate?: boolean | undefined;
  formTarget?: string | undefined;
  height?: number | string | undefined;
  list?: string | undefined;
  max?: number | string | undefined;
  maxLength?: number | undefined;
  min?: number | string | undefined;
  minLength?: number | undefined;
  multiple?: boolean | undefined;
  name?: string | undefined;
  pattern?: string | undefined;
  placeholder?: string | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
  size?: number | undefined;
  src?: string | undefined;
  step?: number | string | undefined;
  type?: string | undefined;
  value?: string | ReadonlyArray<string> | number | undefined;
  width?: number | string | undefined;

}

export interface KeygenHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  autoFocus?: boolean | undefined;
  challenge?: string | undefined;
  disabled?: boolean | undefined;
  form?: string | undefined;
  keyType?: string | undefined;
  keyParams?: string | undefined;
  name?: string | undefined;
}

export interface LabelHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  form?: string | undefined;
  htmlFor?: string | undefined;
}

export interface LiHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  value?: string | ReadonlyArray<string> | number | undefined;
}

export interface LinkHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  as?: string | undefined;
  crossOrigin?: string | undefined;
  href?: string | undefined;
  hrefLang?: string | undefined;
  integrity?: string | undefined;
  media?: string | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  rel?: string | undefined;
  sizes?: string | undefined;
  type?: string | undefined;
  charSet?: string | undefined;
}

export interface MapHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  name?: string | undefined;
}

export interface MenuHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  type?: string | undefined;
}

export interface MediaHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  autoPlay?: boolean | undefined;
  controls?: boolean | undefined;
  controlsList?: string | undefined;
  crossOrigin?: string | undefined;
  loop?: boolean | undefined;
  mediaGroup?: string | undefined;
  muted?: boolean | undefined;
  playsInline?: boolean | undefined;
  preload?: string | undefined;
  src?: string | undefined;
}

export interface MetaHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  charSet?: string | undefined;
  content?: string | undefined;
  httpEquiv?: string | undefined;
  name?: string | undefined;
}

export interface MeterHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  form?: string | undefined;
  high?: number | undefined;
  low?: number | undefined;
  max?: number | string | undefined;
  min?: number | string | undefined;
  optimum?: number | undefined;
  value?: string | ReadonlyArray<string> | number | undefined;
}

export interface QuoteHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  cite?: string | undefined;
}

export interface ObjectHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  classID?: string | undefined;
  data?: string | undefined;
  form?: string | undefined;
  height?: number | string | undefined;
  name?: string | undefined;
  type?: string | undefined;
  useMap?: string | undefined;
  width?: number | string | undefined;
  wmode?: string | undefined;
}

export interface OlHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  reversed?: boolean | undefined;
  start?: number | undefined;
  type?: '1' | 'a' | 'A' | 'i' | 'I' | undefined;
}

export interface OptgroupHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  disabled?: boolean | undefined;
  label?: string | undefined;
}

export interface OptionHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  disabled?: boolean | undefined;
  label?: string | undefined;
  selected?: boolean | undefined;
  value?: string | ReadonlyArray<string> | number | undefined;
}

export interface OutputHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  form?: string | undefined;
  htmlFor?: string | undefined;
  name?: string | undefined;
}

export interface ParamHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  name?: string | undefined;
  value?: string | ReadonlyArray<string> | number | undefined;
}

export interface ProgressHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  max?: number | string | undefined;
  value?: string | ReadonlyArray<string> | number | undefined;
}

export interface SlotHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  name?: string | undefined;
}

export interface ScriptHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  async?: boolean | undefined;
  /** @deprecated */
  charSet?: string | undefined;
  crossOrigin?: string | undefined;
  defer?: boolean | undefined;
  integrity?: string | undefined;
  noModule?: boolean | undefined;
  nonce?: string | undefined;
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
  src?: string | undefined;
  type?: string | undefined;
}

export interface SelectHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  autoComplete?: string | undefined;
  autoFocus?: boolean | undefined;
  disabled?: boolean | undefined;
  form?: string | undefined;
  multiple?: boolean | undefined;
  name?: string | undefined;
  required?: boolean | undefined;
  size?: number | undefined;
  value?: string | ReadonlyArray<string> | number | undefined;
}

export interface SourceHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  media?: string | undefined;
  sizes?: string | undefined;
  src?: string | undefined;
  srcSet?: string | undefined;
  type?: string | undefined;
}

export interface StyleHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  media?: string | undefined;
  nonce?: string | undefined;
  scoped?: boolean | undefined;
  type?: string | undefined;
}

export interface TableHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  cellPadding?: number | string | undefined;
  cellSpacing?: number | string | undefined;
  summary?: string | undefined;
  width?: number | string | undefined;
}

export interface TextareaHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  autoComplete?: string | undefined;
  autoFocus?: boolean | undefined;
  cols?: number | undefined;
  dirName?: string | undefined;
  disabled?: boolean | undefined;
  form?: string | undefined;
  maxLength?: number | undefined;
  minLength?: number | undefined;
  name?: string | undefined;
  placeholder?: string | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
  rows?: number | undefined;
  value?: string | ReadonlyArray<string> | number | undefined;
  wrap?: string | undefined;
}

export interface TdHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
  colSpan?: number | undefined;
  headers?: string | undefined;
  rowSpan?: number | undefined;
  scope?: string | undefined;
  abbr?: string | undefined;
  height?: number | string | undefined;
  width?: number | string | undefined;
  valign?: 'top' | 'middle' | 'bottom' | 'baseline' | undefined;
}

export interface ThHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
  colSpan?: number | undefined;
  headers?: string | undefined;
  rowSpan?: number | undefined;
  scope?: string | undefined;
  abbr?: string | undefined;
}

export interface TimeHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  dateTime?: string | undefined;
}

export interface TrackHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
  default?: boolean | undefined;
  kind?: string | undefined;
  label?: string | undefined;
  src?: string | undefined;
  srcLang?: string | undefined;
}

export interface VideoHTMLAttributes<T extends EventTarget> extends MediaHTMLAttributes<T> {
  height?: number | string | undefined;
  playsInline?: boolean | undefined;
  poster?: string | undefined;
  width?: number | string | undefined;
  disablePictureInPicture?: boolean | undefined;
  disableRemotePlayback?: boolean | undefined;
}

// export interface WebViewHTMLAttributes<T extends EventTarget> extends HTMLAttributes<T> {
//   allowFullScreen?: boolean | undefined;
//   allowpopups?: boolean | undefined;
//   autoFocus?: boolean | undefined;
//   autosize?: boolean | undefined;
//   blinkfeatures?: string | undefined;
//   disableblinkfeatures?: string | undefined;
//   disableguestresize?: boolean | undefined;
//   disablewebsecurity?: boolean | undefined;
//   guestinstance?: string | undefined;
//   httpreferrer?: string | undefined;
//   nodeintegration?: boolean | undefined;
//   partition?: string | undefined;
//   plugins?: boolean | undefined;
//   preload?: string | undefined;
//   src?: string | undefined;
//   useragent?: string | undefined;
//   webpreferences?: string | undefined;
// }

export type DetailedHTMLProps<E extends HTMLAttributes<T>, T extends EventTarget> = (
  Reactive<RefAttributes<T> & E>
);

export type HTMLProps<T extends EventTarget> = AllHTMLAttributes<T> & RefAttributes<T>;

export interface DetailedHTMLFactory<P extends HTMLAttributes<T>, T extends HTMLElement>
  extends DOMFactory<P, T> {
  (props?: Reactive<RefAttributes<T> & P | null>, ...children: VNode[]): VNode;
}

export interface CompostateHTML {
  a: DetailedHTMLFactory<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
  abbr: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  address: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  area: DetailedHTMLFactory<AreaHTMLAttributes<HTMLAreaElement>, HTMLAreaElement>;
  article: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  aside: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  audio: DetailedHTMLFactory<AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement>;
  b: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  base: DetailedHTMLFactory<BaseHTMLAttributes<HTMLBaseElement>, HTMLBaseElement>;
  bdi: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  bdo: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  big: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  blockquote: DetailedHTMLFactory<BlockquoteHTMLAttributes<HTMLElement>, HTMLElement>;
  body: DetailedHTMLFactory<HTMLAttributes<HTMLBodyElement>, HTMLBodyElement>;
  br: DetailedHTMLFactory<HTMLAttributes<HTMLBRElement>, HTMLBRElement>;
  button: DetailedHTMLFactory<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
  canvas: DetailedHTMLFactory<CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
  caption: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  cite: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  code: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  col: DetailedHTMLFactory<ColHTMLAttributes<HTMLTableColElement>, HTMLTableColElement>;
  colgroup: DetailedHTMLFactory<ColgroupHTMLAttributes<HTMLTableColElement>, HTMLTableColElement>;
  data: DetailedHTMLFactory<DataHTMLAttributes<HTMLDataElement>, HTMLDataElement>;
  datalist: DetailedHTMLFactory<HTMLAttributes<HTMLDataListElement>, HTMLDataListElement>;
  dd: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  del: DetailedHTMLFactory<DelHTMLAttributes<HTMLElement>, HTMLElement>;
  details: DetailedHTMLFactory<DetailsHTMLAttributes<HTMLElement>, HTMLElement>;
  dfn: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  dialog: DetailedHTMLFactory<DialogHTMLAttributes<HTMLDialogElement>, HTMLDialogElement>;
  div: DetailedHTMLFactory<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
  dl: DetailedHTMLFactory<HTMLAttributes<HTMLDListElement>, HTMLDListElement>;
  dt: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  em: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  embed: DetailedHTMLFactory<EmbedHTMLAttributes<HTMLEmbedElement>, HTMLEmbedElement>;
  fieldset: DetailedHTMLFactory<FieldsetHTMLAttributes<HTMLFieldSetElement>, HTMLFieldSetElement>;
  figcaption: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  figure: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  footer: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  form: DetailedHTMLFactory<FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;
  h1: DetailedHTMLFactory<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
  h2: DetailedHTMLFactory<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
  h3: DetailedHTMLFactory<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
  h4: DetailedHTMLFactory<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
  h5: DetailedHTMLFactory<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
  h6: DetailedHTMLFactory<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
  head: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLHeadElement>;
  header: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  hgroup: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  hr: DetailedHTMLFactory<HTMLAttributes<HTMLHRElement>, HTMLHRElement>;
  html: DetailedHTMLFactory<HtmlHTMLAttributes<HTMLHtmlElement>, HTMLHtmlElement>;
  i: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  iframe: DetailedHTMLFactory<IframeHTMLAttributes<HTMLIFrameElement>, HTMLIFrameElement>;
  img: DetailedHTMLFactory<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
  input: DetailedHTMLFactory<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
  ins: DetailedHTMLFactory<InsHTMLAttributes<HTMLModElement>, HTMLModElement>;
  kbd: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  keygen: DetailedHTMLFactory<KeygenHTMLAttributes<HTMLElement>, HTMLElement>;
  label: DetailedHTMLFactory<LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
  legend: DetailedHTMLFactory<HTMLAttributes<HTMLLegendElement>, HTMLLegendElement>;
  li: DetailedHTMLFactory<LiHTMLAttributes<HTMLLIElement>, HTMLLIElement>;
  link: DetailedHTMLFactory<LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>;
  main: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  map: DetailedHTMLFactory<MapHTMLAttributes<HTMLMapElement>, HTMLMapElement>;
  mark: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  menu: DetailedHTMLFactory<MenuHTMLAttributes<HTMLElement>, HTMLElement>;
  menuitem: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  meta: DetailedHTMLFactory<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>;
  meter: DetailedHTMLFactory<MeterHTMLAttributes<HTMLElement>, HTMLElement>;
  nav: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  noscript: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  object: DetailedHTMLFactory<ObjectHTMLAttributes<HTMLObjectElement>, HTMLObjectElement>;
  ol: DetailedHTMLFactory<OlHTMLAttributes<HTMLOListElement>, HTMLOListElement>;
  optgroup: DetailedHTMLFactory<OptgroupHTMLAttributes<HTMLOptGroupElement>, HTMLOptGroupElement>;
  option: DetailedHTMLFactory<OptionHTMLAttributes<HTMLOptionElement>, HTMLOptionElement>;
  output: DetailedHTMLFactory<OutputHTMLAttributes<HTMLElement>, HTMLElement>;
  p: DetailedHTMLFactory<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
  param: DetailedHTMLFactory<ParamHTMLAttributes<HTMLParamElement>, HTMLParamElement>;
  picture: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  pre: DetailedHTMLFactory<HTMLAttributes<HTMLPreElement>, HTMLPreElement>;
  progress: DetailedHTMLFactory<ProgressHTMLAttributes<HTMLProgressElement>, HTMLProgressElement>;
  q: DetailedHTMLFactory<QuoteHTMLAttributes<HTMLQuoteElement>, HTMLQuoteElement>;
  rp: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  rt: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  ruby: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  s: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  samp: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  slot: DetailedHTMLFactory<SlotHTMLAttributes<HTMLSlotElement>, HTMLSlotElement>;
  script: DetailedHTMLFactory<ScriptHTMLAttributes<HTMLScriptElement>, HTMLScriptElement>;
  section: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  select: DetailedHTMLFactory<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;
  small: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  source: DetailedHTMLFactory<SourceHTMLAttributes<HTMLSourceElement>, HTMLSourceElement>;
  span: DetailedHTMLFactory<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
  strong: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  style: DetailedHTMLFactory<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>;
  sub: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  summary: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  sup: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  table: DetailedHTMLFactory<TableHTMLAttributes<HTMLTableElement>, HTMLTableElement>;
  template: DetailedHTMLFactory<HTMLAttributes<HTMLTemplateElement>, HTMLTemplateElement>;
  tbody: DetailedHTMLFactory<HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
  td: DetailedHTMLFactory<TdHTMLAttributes<HTMLTableDataCellElement>, HTMLTableDataCellElement>;
  textarea: DetailedHTMLFactory<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;
  tfoot: DetailedHTMLFactory<HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
  th: DetailedHTMLFactory<ThHTMLAttributes<HTMLTableHeaderCellElement>, HTMLTableHeaderCellElement>;
  thead: DetailedHTMLFactory<HTMLAttributes<HTMLTableSectionElement>, HTMLTableSectionElement>;
  time: DetailedHTMLFactory<TimeHTMLAttributes<HTMLElement>, HTMLElement>;
  title: DetailedHTMLFactory<HTMLAttributes<HTMLTitleElement>, HTMLTitleElement>;
  tr: DetailedHTMLFactory<HTMLAttributes<HTMLTableRowElement>, HTMLTableRowElement>;
  track: DetailedHTMLFactory<TrackHTMLAttributes<HTMLTrackElement>, HTMLTrackElement>;
  u: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  ul: DetailedHTMLFactory<HTMLAttributes<HTMLUListElement>, HTMLUListElement>;
  'var': DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  video: DetailedHTMLFactory<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
  wbr: DetailedHTMLFactory<HTMLAttributes<HTMLElement>, HTMLElement>;
  // webview: DetailedHTMLFactory<WebViewHTMLAttributes<HTMLWebViewElement>, HTMLWebViewElement>;
}
