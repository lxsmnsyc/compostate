export type Renderer = <RenderResult>(
  root: ShadowRoot,
  result: RenderResult,
) => void;

let RENDERER: Renderer | undefined;

export function setRenderer(renderer: Renderer): void {
  RENDERER = renderer;
}

export function render<RenderResult>(
  root: ShadowRoot,
  result: RenderResult,
): void {
  if (!RENDERER) {
    throw new Error(
      "Attempted to render before a renderer is defined. Call 'setRenderer' first.",
    );
  }
  RENDERER(root, result);
}
