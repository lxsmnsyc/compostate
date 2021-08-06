export interface AbstractView {
  styleMedia: StyleMedia;
  document: Document;
}

export interface Touch {
  identifier: number;
  target: EventTarget;
  screenX: number;
  screenY: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
}

export interface TouchList {
  [index: number]: Touch;
  length: number;
  item(index: number): Touch;
  identifiedTouch(identifier: number): Touch;
}
