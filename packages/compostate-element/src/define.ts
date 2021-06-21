import { effect, state, State } from 'compostate';
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
  options: Component<RenderResult, Props>,
): void {
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

      // Just to ensure the type
      this.props = Object.fromEntries(currentProps.map((prop) => (
        [prop, state<string | undefined>({
          isolate: true,
          value: () => undefined
        })]
      ))) as PropObject<Props>;

      this.root = this.attachShadow({
        mode: 'closed',
      });
    }

    connectedCallback() {
      this.lifecycle = effect({
        isolate: true,
        setup: () => {
          this.context = createContext();
          const popContext = pushContext(this.context);
          const result = options.setup(this.props);
          popContext();

          let mounted = false;

          effect(() => {
            const nodes = result();

            render(this.root, nodes);
            if (mounted && this.context) {
              runContext(this.context, 'updated');
            }
            mounted = true;
          });
        },
      });

      if (this.context) {
        runContext(this.context, 'connected');
      }
    }

    disconnectedCallback() {
      if (this.context) {
        runContext(this.context, 'disconnected');
        this.context = undefined;
      }
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
