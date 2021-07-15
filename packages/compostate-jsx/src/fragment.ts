export default class VirtualFragment {
  public element: HTMLDivElement;

  constructor() {
    this.element = document.createElement('div');
  }

  private orphans?: ChildNode[];

  private parentNode?: (Node & ParentNode);

  unwrap(): void {
    if (!this.element.parentNode) {
      return;
    }
    this.captureFocused(this.element);
    this.orphans = [];

    while (this.element.firstChild) {
      this.orphans.push(this.element.firstChild);
      this.element.parentNode.insertBefore(this.element.firstChild, this.element);
    }

    this.parentNode = this.element.parentNode;
    if (this.orphans.length) {
      this.parentNode.removeChild(this.element);
    }
    this.restoreFocused();
  }

  rewrap(): void {
    if (!(this.parentNode && this.parentNode.parentNode)) {
      return;
    }
    if (this.orphans?.length) {
      this.parentNode.insertBefore(this.element, this.orphans[0]);
      if (this.orphans[0].parentNode) {
        this.captureFocused(this.orphans[0].parentNode);
      }
      while (true) {
        const orphan = this.orphans.shift();
        if (orphan) {
          this.element.appendChild(orphan);
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
