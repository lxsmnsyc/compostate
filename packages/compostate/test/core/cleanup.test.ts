import { describe, expect, it, vi } from 'vitest';
import {
  atom,
  batchCleanup,
  onCleanup,
  syncEffect,
  unbatchCleanup,
} from '../../src';

describe('batchCleanup', () => {
  it('collects cleanups and runs them on dispose', () => {
    const first = vi.fn();
    const second = vi.fn();
    const dispose = batchCleanup(() => {
      onCleanup(first);
      onCleanup(second);
    });
    expect(first).not.toHaveBeenCalled();
    dispose();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('only disposes once', () => {
    const cleanup = vi.fn();
    const dispose = batchCleanup(() => {
      onCleanup(cleanup);
    });
    dispose();
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('disposes nested boundaries with the parent', () => {
    const cleanup = vi.fn();
    const dispose = batchCleanup(() => {
      batchCleanup(() => {
        onCleanup(cleanup);
      });
    });
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('disposes the effects created inside it', () => {
    const value = atom(1);
    const callback = vi.fn(() => {
      value();
    });
    const dispose = batchCleanup(() => {
      syncEffect(callback);
    });
    dispose();
    value(2);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('unbatchCleanup', () => {
  it('detaches cleanups from the enclosing boundary', () => {
    const cleanup = vi.fn();
    const dispose = batchCleanup(() => {
      unbatchCleanup(() => {
        onCleanup(cleanup);
      });
    });
    dispose();
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('returns the value of its callback', () => {
    expect(unbatchCleanup(() => 'value')).toBe('value');
  });
});

describe('onCleanup', () => {
  it('returns the callback it was given', () => {
    const cleanup = vi.fn();
    expect(onCleanup(cleanup)).toBe(cleanup);
  });

  it('is a no-op outside of a cleanup boundary', () => {
    const cleanup = vi.fn();
    onCleanup(cleanup);
    expect(cleanup).not.toHaveBeenCalled();
  });
});
