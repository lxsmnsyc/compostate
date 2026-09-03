import { describe, expect, it, vi } from 'vitest';
import {
  atom,
  isPending,
  resource,
  ResourceNotReadyError,
  suspenseBoundary,
  syncEffect,
} from '../../src';

function tick(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

describe('resource', () => {
  it('is pending until the promise settles', async () => {
    const value = resource(async () => 1);
    expect(isPending(value)).toBe(true);
    await tick();
    expect(value()).toBe(1);
  });

  it('accepts a synchronous computation', async () => {
    const value = resource(() => 1);
    // Resources are lazy, so the first read is what starts the request.
    expect(isPending(value)).toBe(true);
    await tick();
    expect(value()).toBe(1);
  });

  it('rethrows the rejection reason', async () => {
    const failure = new Error('failed');
    const value = resource(() => Promise.reject(failure));
    expect(isPending(value)).toBe(true);
    await tick();
    expect(value).toThrow('failed');
  });

  it('throws a ResourceNotReadyError carrying the pending request', () => {
    const request = Promise.resolve(1);
    const value = resource(() => request);
    try {
      value();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ResourceNotReadyError);
      expect((error as ResourceNotReadyError<number>).request).toBeInstanceOf(
        Promise,
      );
    }
  });

  it('refetches when a tracked atom changes', async () => {
    const id = atom(1);
    const compute = vi.fn(async () => id());
    const value = resource(compute);
    expect(isPending(value)).toBe(true);
    await tick();
    expect(value()).toBe(1);
    id(2);
    expect(isPending(value)).toBe(true);
    await tick();
    expect(value()).toBe(2);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('notifies its trackers once it resolves', async () => {
    const value = resource(async () => 1);
    const seen: number[] = [];
    syncEffect(() => {
      if (!isPending(value)) {
        seen.push(value());
      }
    });
    await tick();
    expect(seen).toEqual([1]);
  });
});

describe('suspenseBoundary', () => {
  it('is notified when an effect inside it reads a pending resource', () => {
    const handler = vi.fn();
    suspenseBoundary(() => {
      const value = resource(async () => 1);
      syncEffect(() => {
        value();
      });
    }, handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('is not notified when nothing is pending', () => {
    const handler = vi.fn();
    suspenseBoundary(() => {
      syncEffect(() => {
        // no-op
      });
    }, handler);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns the value of its callback', () => {
    expect(suspenseBoundary(() => 'value', vi.fn())).toBe('value');
  });
});

describe('isPending', () => {
  it('reports false for a computation that settles', () => {
    expect(isPending(() => 1)).toBe(false);
  });

  it('reports false for a computation that throws a plain error', () => {
    expect(
      isPending(() => {
        throw new Error('failed');
      }),
    ).toBe(false);
  });
});
