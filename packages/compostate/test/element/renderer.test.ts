// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { flushIdle } from '../../src';
import { define, setRenderer } from '../../src/element';

describe('setRenderer', () => {
  it('fails to render while no renderer is set', () => {
    define({
      name: 'no-renderer',
      setup: () => () => 'value',
    });
    document.body.append(document.createElement('no-renderer'));
    expect(flushIdle).toThrow(
      'Attempted to render before a renderer is defined.',
    );
  });

  it('passes the shadow root and the render result to the renderer', () => {
    const renderer = vi.fn();
    setRenderer(renderer);
    define({
      name: 'with-renderer',
      setup: () => () => 'value',
    });
    document.body.append(document.createElement('with-renderer'));
    flushIdle();
    expect(renderer).toHaveBeenCalledTimes(1);
    expect(renderer.mock.calls[0][1]).toBe('value');
  });
});
