// @vitest-environment happy-dom
import type { JSX, ReactNode } from 'react';
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { atom, flushIdle } from '../../src';
import {
  defineComponent,
  onEffect,
  onMounted,
  onUnmounted,
  onUpdated,
  useCompostateSetup,
} from '../../src/react';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

let container: HTMLDivElement;
let unmount: () => void;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
});

afterEach(() => {
  unmount?.();
  container.remove();
});

function mount(node: ReactNode): void {
  const root = createRoot(container);
  unmount = () => {
    act(() => {
      root.unmount();
    });
    unmount = () => {};
  };
  act(() => {
    root.render(node);
  });
}

describe('defineComponent', () => {
  it('renders the result of the render function', () => {
    const Counter = defineComponent(() => () => <span>hello</span>);
    mount(<Counter />);
    expect(container.textContent).toBe('hello');
  });

  it('re-renders when a tracked atom changes', () => {
    const count = atom(0);
    const Counter = defineComponent(() => () => <span>{count()}</span>);
    mount(<Counter />);
    expect(container.textContent).toBe('0');
    act(() => {
      count(1);
    });
    expect(container.textContent).toBe('1');
  });

  it('exposes props reactively', () => {
    interface Props extends Record<string, unknown> {
      value: number;
    }
    const Message = defineComponent<Props>(props => () => (
      <span>{props.value}</span>
    ));
    function Host(): JSX.Element {
      const [value, setValue] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setValue(1)}>
            bump
          </button>
          <Message value={value} />
        </>
      );
    }
    mount(<Host />);
    expect(container.textContent).toContain('0');
    act(() => {
      container.querySelector('button')!.click();
    });
    expect(container.textContent).toContain('1');
  });

  it('runs the setup only once across re-renders', () => {
    const setup = vi.fn((props: { value: number }) => () => (
      <span>{props.value}</span>
    ));
    const Message = defineComponent(setup);
    function Host(): JSX.Element {
      const [value, setValue] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setValue(1)}>
            bump
          </button>
          <Message value={value} />
        </>
      );
    }
    mount(<Host />);
    act(() => {
      container.querySelector('button')!.click();
    });
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it('runs the mounted and unmounted hooks', () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    const Counter = defineComponent(() => {
      onMounted(mounted);
      onUnmounted(unmounted);
      return () => <span>hello</span>;
    });
    mount(<Counter />);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    unmount();
    expect(unmounted).toHaveBeenCalledTimes(1);
  });

  it('runs the updated hook only after the first render', () => {
    const updated = vi.fn();
    const count = atom(0);
    const Counter = defineComponent(() => {
      onUpdated(updated);
      return () => <span>{count()}</span>;
    });
    mount(<Counter />);
    expect(updated).not.toHaveBeenCalled();
    act(() => {
      count(1);
    });
    expect(updated).toHaveBeenCalledTimes(1);
  });

  it('runs the registered effects once mounted', () => {
    const count = atom(0);
    const seen: number[] = [];
    const Counter = defineComponent(() => {
      onEffect(() => {
        seen.push(count());
      });
      return () => <span>{count()}</span>;
    });
    mount(<Counter />);
    flushIdle();
    expect(seen).toEqual([0]);
    act(() => {
      count(1);
    });
    flushIdle();
    expect(seen).toEqual([0, 1]);
  });

  it('stops reacting to atoms once unmounted', () => {
    const count = atom(0);
    const render = vi.fn(() => <span>{count()}</span>);
    const Counter = defineComponent(() => render);
    mount(<Counter />);
    const before = render.mock.calls.length;
    unmount();
    act(() => {
      count(1);
    });
    expect(render).toHaveBeenCalledTimes(before);
  });
});

describe('useCompostateSetup', () => {
  it('returns the value produced by the render function', () => {
    function Counter(): JSX.Element {
      const count = useCompostateSetup(() => {
        const value = atom(1);
        return () => value();
      }, {});
      return <span>{count}</span>;
    }
    mount(<Counter />);
    expect(container.textContent).toBe('1');
  });

  it('reports a setup that does not return a render function', () => {
    const Broken = defineComponent(() => 'not a function' as never);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => {
        mount(<Broken />);
      }).toThrow('The setup function must return a render function');
    } finally {
      errors.mockRestore();
    }
  });
});
