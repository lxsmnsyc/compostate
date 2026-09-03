/** @jsxImportSource preact */
// @vitest-environment happy-dom
import type { JSX, VNode } from 'preact';
import { render } from 'preact';
import { useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { atom, flushIdle } from '../../src';
import {
  defineComponent,
  onEffect,
  onMounted,
  onUnmounted,
  onUpdated,
  useCompostateSetup,
} from '../../src/preact';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
});

afterEach(async () => {
  await unmount();
  container.remove();
});

async function mount(node: VNode): Promise<void> {
  await act(() => {
    render(node, container);
  });
}

async function unmount(): Promise<void> {
  await act(() => {
    render(null, container);
  });
}

describe('defineComponent', () => {
  it('renders the result of the render function', async () => {
    const Counter = defineComponent(() => () => <span>hello</span>);
    await mount(<Counter />);
    expect(container.textContent).toBe('hello');
  });

  it('re-renders when a tracked atom changes', async () => {
    const count = atom(0);
    const Counter = defineComponent(() => () => <span>{count()}</span>);
    await mount(<Counter />);
    expect(container.textContent).toBe('0');
    await act(() => {
      count(1);
    });
    expect(container.textContent).toBe('1');
  });

  it('exposes props reactively', async () => {
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
    await mount(<Host />);
    expect(container.textContent).toContain('0');
    await act(() => {
      container.querySelector('button')!.click();
    });
    expect(container.textContent).toContain('1');
  });

  it('runs the setup only once across re-renders', async () => {
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
    await mount(<Host />);
    await act(() => {
      container.querySelector('button')!.click();
    });
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it('runs the mounted and unmounted hooks', async () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    const Counter = defineComponent(() => {
      onMounted(mounted);
      onUnmounted(unmounted);
      return () => <span>hello</span>;
    });
    await mount(<Counter />);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
    await unmount();
    expect(unmounted).toHaveBeenCalledTimes(1);
  });

  it('runs the updated hook only after the first render', async () => {
    const updated = vi.fn();
    const count = atom(0);
    const Counter = defineComponent(() => {
      onUpdated(updated);
      return () => <span>{count()}</span>;
    });
    await mount(<Counter />);
    expect(updated).not.toHaveBeenCalled();
    await act(() => {
      count(1);
    });
    expect(updated).toHaveBeenCalledTimes(1);
  });

  it('runs the registered effects once mounted', async () => {
    const count = atom(0);
    const seen: number[] = [];
    const Counter = defineComponent(() => {
      onEffect(() => {
        seen.push(count());
      });
      return () => <span>{count()}</span>;
    });
    await mount(<Counter />);
    flushIdle();
    expect(seen).toEqual([0]);
    await act(() => {
      count(1);
    });
    flushIdle();
    expect(seen).toEqual([0, 1]);
  });

  it('stops reacting to atoms once unmounted', async () => {
    const count = atom(0);
    const renderFn = vi.fn(() => <span>{count()}</span>);
    const Counter = defineComponent(() => renderFn);
    await mount(<Counter />);
    const before = renderFn.mock.calls.length;
    await unmount();
    await act(() => {
      count(1);
    });
    expect(renderFn).toHaveBeenCalledTimes(before);
  });
});

describe('useCompostateSetup', () => {
  it('returns the value produced by the render function', async () => {
    function Counter(): JSX.Element {
      const count = useCompostateSetup(() => {
        const value = atom(1);
        return () => value();
      }, {});
      return <span>{count}</span>;
    }
    await mount(<Counter />);
    expect(container.textContent).toBe('1');
  });
});
