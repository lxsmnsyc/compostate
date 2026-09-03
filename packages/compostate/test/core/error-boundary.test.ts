import { describe, expect, it, vi } from 'vitest';
import { atom, captureError, errorBoundary, syncEffect } from '../../src';

describe('errorBoundary', () => {
  it('catches errors thrown by the effects created inside it', () => {
    const handler = vi.fn();
    const failure = new Error('failed');
    errorBoundary(() => {
      syncEffect(() => {
        throw failure;
      });
    }, handler);
    expect(handler).toHaveBeenCalledWith(failure);
  });

  it('catches errors thrown on a later run', () => {
    const handler = vi.fn();
    const failure = new Error('failed');
    const value = atom(1);
    errorBoundary(() => {
      syncEffect(() => {
        if (value() > 1) {
          throw failure;
        }
      });
    }, handler);
    expect(handler).not.toHaveBeenCalled();
    value(2);
    expect(handler).toHaveBeenCalledWith(failure);
  });

  it('forwards to the parent boundary when the handler itself fails', () => {
    const outer = vi.fn();
    const inner = new Error('inner');
    const original = new Error('original');
    errorBoundary(() => {
      errorBoundary(
        () => {
          syncEffect(() => {
            throw original;
          });
        },
        () => {
          throw inner;
        },
      );
    }, outer);
    expect(outer).toHaveBeenCalledWith(inner);
    expect(outer).toHaveBeenCalledWith(original);
  });

  it('rethrows when there is no boundary', () => {
    expect(() =>
      syncEffect(() => {
        throw new Error('failed');
      }),
    ).toThrow('failed');
  });

  it('does not catch errors thrown by its own callback', () => {
    expect(() =>
      errorBoundary(() => {
        throw new Error('failed');
      }, vi.fn()),
    ).toThrow('failed');
  });

  it('returns the value of its callback', () => {
    expect(errorBoundary(() => 'value', vi.fn())).toBe('value');
  });
});

describe('captureError', () => {
  it('routes an error to the boundary that was active at capture time', () => {
    const handler = vi.fn();
    const failure = new Error('failed');
    let report: ((error: unknown) => void) | undefined;
    errorBoundary(() => {
      report = captureError();
    }, handler);
    report!(failure);
    expect(handler).toHaveBeenCalledWith(failure);
  });

  it('rethrows when captured outside of a boundary', () => {
    const report = captureError();
    expect(() => report(new Error('failed'))).toThrow('failed');
  });
});
