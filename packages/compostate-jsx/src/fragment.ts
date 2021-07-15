export default class VirtualFragment {
  public element: HTMLDivElement;

  private marker: Comment;

  constructor() {
    this.element = document.createElement('div');
    this.marker = document.createComment('');
  }

  private startChild?: ChildNode | null;

  private endChild?: ChildNode | null;

  unwrap(): void {
    const parent = this.element.parentNode;
    if (!parent) {
      return;
    }
    // Capture focused element
    this.captureFocused(this.element);

    this.startChild = this.element.firstChild;
    this.endChild = this.element.lastChild;

    while (this.element.firstChild) {
      parent.insertBefore(this.element.firstChild, this.element);
    }

    if (this.startChild) {
      parent.removeChild(this.element);
    } else {
      parent.replaceChild(this.marker, this.element);
    }

    // Refocus
    this.restoreFocused();
  }

  rewrap(): void {
    if (this.element.parentNode) {
      return;
    }
    if (this.marker.parentNode) {
      this.marker.parentNode.replaceChild(this.element, this.marker);
      return;
    }

    let currentChild = this.startChild;

    if (currentChild) {
      currentChild.parentNode?.insertBefore(this.element, currentChild);

      while (currentChild) {
        this.element.appendChild(currentChild);
        if (currentChild !== this.endChild) {
          currentChild = currentChild.nextSibling;
        } else {
          break;
        }
      }
    }
  }

  private focusedElement?: Element | null;

  captureFocused(ancestorElement: Node): void {
    if (ancestorElement.contains(document.activeElement)) {
      this.focusedElement = document.activeElement;
    }
  }

  restoreFocused(): void {
    if (this.focusedElement) {
      (this.focusedElement as HTMLElement).focus();
      this.focusedElement = null;
    }
  }
}
