import {
  createRoot,
  effect,
  reactive,
} from 'compostate';
import {
  createDOMContext,
  DOMContext,
  getDOMContext,
  runContext,
} from './composition';
import { render } from './renderer';
import kebabify from './utils/kebabify';

export type PropObject<Props extends string> = {
  [key in Props]?: string | undefined;
};

export type ComponentRender<RenderResult> = (
  () => RenderResult
);
export type ComponentSetup<RenderResult, Props extends string> = (
  (props: PropObject<Props>) => ComponentRender<RenderResult>
);

export interface Component<RenderResult, Props extends string> {
  name: string;
  props?: Props[];
  setup: ComponentSetup<RenderResult, Props>;
}

export default function define<RenderResult, Props extends string>(
  options: Component<RenderResult, Props> | ComponentSetup<RenderResult, Props>,
): void {
  if (typeof options === 'function') {
    define({
      name: kebabify(options.name),
      setup: options,
    });
    return;
  }

  const { props, name } = options;

  const currentProps = props ?? [];

  customElements.define(kebabify(name), class extends HTMLElement {
    static get observedAttributes(): string[] {
      return currentProps;
    }

    private context?: DOMContext;

    private props: PropObject<Props>;

    private root: ShadowRoot;

    private lifecycle?: () => void;

    constructor() {
      super();

      // Create a shallow object of state from
      // the defined properties.
      this.props = createRoot(() => reactive({}));

      this.root = this.attachShadow({
        mode: 'closed',
      });
    }

    connectedCallback() {
      // Isolate so that the lifecycle of
      // this effect is not synchronously
      // tracked by a parent effect.
      this.lifecycle = createRoot(() => (
        createDOMContext(() => (
          effect(() => {
            // Create a context for composition
            this.context = getDOMContext();
            const result = options.setup(this.props);

            let mounted = false;

            // The effect is separated so that
            // observed values in the render function
            // do not update nor re-evaluate the setup
            // function
            effect(() => {
              const nodes = result();

              // Render the result to the root
              render(this.root, nodes);

              // If the element has been mounted before
              // the re-render is an update call, we
              // run the onUpdated hooks.
              if (mounted && this.context) {
                runContext(this.context, 'updated');
              }

              // Mark the element as mounted.
              mounted = true;
            });
          })
        ))
      ));

      // Run onConnected hooks
      if (this.context) {
        runContext(this.context, 'connected');
      }
    }

    disconnectedCallback() {
      // Run onDisconnected hooks
      if (this.context) {
        runContext(this.context, 'disconnected');

        // Remove context
        this.context = undefined;
      }

      // If there's a lifecycle, make sure to clean it
      if (this.lifecycle) {
        this.lifecycle();
        this.lifecycle = undefined;
      }
    }

    adoptedCallback() {
      if (this.context) {
        runContext(this.context, 'adopted');
      }
    }

    attributeChangedCallback(attribute: Props, _: string, newValue: string) {
      this.props[attribute] = newValue;
    }
  });
}
