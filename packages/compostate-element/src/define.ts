import {
  effect,
  isolate,
  state,
  State,
} from 'compostate';
import {
  Context,
  createContext,
  pushContext,
  runContext,
} from './composition';
import { render } from './renderer';
import kebabify from './utils/kebabify';

export type PropObject<Props extends string> = {
  [key in Props]: State<string | undefined>;
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

    private context?: Context;

    private props: PropObject<Props>;

    private root: ShadowRoot;

    private lifecycle?: () => void;

    constructor() {
      super();

      // Create a shallow object of state from
      // the defined properties.
      this.props = Object.fromEntries(currentProps.map((prop) => (
        [
          prop,
          isolate(() => (
            state<string | undefined>({
              // In case that the element is created inside
              // an unknown effect, keep this state
              // from getting tracked.
              value: () => undefined,
            })
          )),
        ]
      ))) as PropObject<Props>;

      this.root = this.attachShadow({
        mode: 'closed',
      });
    }

    connectedCallback() {
      this.lifecycle = isolate(() => (
        effect({
          // Isolate so that the lifecycle of
          // this effect is not synchronously
          // tracked by a parent effect.
          setup: () => {
            // Create a context for composition
            this.context = createContext();
            const popContext = pushContext(this.context);
            const result = options.setup(this.props);
            popContext();

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
          },
        })
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
      this.props[attribute].value = newValue;
    }
  });
}
