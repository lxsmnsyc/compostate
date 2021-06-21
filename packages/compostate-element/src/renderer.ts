export type Renderer = <RenderResult>(root: ShadowRoot, result: RenderResult) => void;

let RENDERER: Renderer;

export function setRenderer(renderer: Renderer): void {
  RENDERER = renderer;
}

export function render<RenderResult>(root: ShadowRoot, result: RenderResult): void {
  if (RENDERER) {
    RENDERER(root, result);
  } else {
    throw new Error(`
Attempted to render before renderer is defined.

Make sure that 'setRenderer' has been called first.
`);
  }
}
