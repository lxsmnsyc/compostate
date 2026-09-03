// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { atom, flushIdle } from '../../src';
import {
  define,
  onConnected,
  onDisconnected,
  onUpdated,
  setRenderer,
} from '../../src/element';

const rendered: string[] = [];

setRenderer((root, result) => {
  rendered.push(String(result));
  root.textContent = String(result);
});

let counter = 0;

function uniqueName(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function mount(name: string): HTMLElement {
  const element = document.createElement(name);
  document.body.append(element);
  flushIdle();
  return element;
}

describe('define', () => {
  beforeEach(() => {
    rendered.length = 0;
    document.body.innerHTML = '';
  });

  it('renders the setup result when the element connects', () => {
    const name = uniqueName('render-once');
    define({
      name,
      setup: () => () => 'hello',
    });
    mount(name);
    expect(rendered).toEqual(['hello']);
  });

  it('derives the tag name from a bare setup function', () => {
    define(function BareSetup() {
      return () => 'bare';
    });
    mount('bare-setup');
    expect(rendered).toEqual(['bare']);
  });

  it('re-renders when a tracked atom changes', () => {
    const name = uniqueName('tracked');
    const count = atom(0);
    define({
      name,
      setup: () => () => `count: ${count()}`,
    });
    mount(name);
    count(1);
    flushIdle();
    expect(rendered).toEqual(['count: 0', 'count: 1']);
  });

  it('exposes observed attributes as reactive props', () => {
    const name = uniqueName('observed');
    define<string, 'value'>({
      name,
      props: ['value'],
      setup: props => () => `value: ${props.value ?? 'none'}`,
    });
    const element = mount(name);
    element.setAttribute('value', 'first');
    flushIdle();
    expect(rendered).toEqual(['value: none', 'value: first']);
  });

  it('does not re-run the setup when a prop changes', () => {
    const name = uniqueName('setup-once');
    const setup = vi.fn((props: { value?: string }) => () => `${props.value}`);
    define({ name, props: ['value'], setup });
    const element = mount(name);
    element.setAttribute('value', 'first');
    flushIdle();
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it('runs the connected and disconnected hooks', () => {
    const name = uniqueName('lifecycle');
    const connected = vi.fn();
    const disconnected = vi.fn();
    define({
      name,
      setup: () => {
        onConnected(connected);
        onDisconnected(disconnected);
        return () => 'lifecycle';
      },
    });
    const element = mount(name);
    expect(connected).toHaveBeenCalledTimes(1);
    expect(disconnected).not.toHaveBeenCalled();
    element.remove();
    expect(disconnected).toHaveBeenCalledTimes(1);
  });

  it('runs the updated hook only on re-render', () => {
    const name = uniqueName('updated');
    const updated = vi.fn();
    const count = atom(0);
    define({
      name,
      setup: () => {
        onUpdated(updated);
        return () => `count: ${count()}`;
      },
    });
    mount(name);
    expect(updated).not.toHaveBeenCalled();
    count(1);
    flushIdle();
    expect(updated).toHaveBeenCalledTimes(1);
  });

  it('stops re-rendering once the element is removed', () => {
    const name = uniqueName('disposed');
    const count = atom(0);
    define({
      name,
      setup: () => () => `count: ${count()}`,
    });
    const element = mount(name);
    element.remove();
    count(1);
    flushIdle();
    expect(rendered).toEqual(['count: 0']);
  });
});
