import { describe, expect, it } from 'vitest';
import {
  ResourceNotReadyError,
  toResult,
  waitForAll,
  waitForAny,
  waitForNone,
  waitForRace,
} from '../../src';

function pending(): () => never {
  return () => {
    throw new ResourceNotReadyError(new Promise(() => {}));
  };
}

function failing(error: unknown): () => never {
  return () => {
    throw error;
  };
}

describe('toResult', () => {
  it('reports a value that reads successfully', () => {
    expect(toResult(() => 1)).toEqual({ type: 'success', value: 1 });
  });

  it('reports a pending read and keeps the request', () => {
    const result = toResult(pending());
    expect(result.type).toBe('pending');
    expect(result).toHaveProperty('request');
  });

  it('reports a failed read', () => {
    const failure = new Error('failed');
    expect(toResult(failing(failure))).toEqual({
      type: 'failure',
      value: failure,
    });
  });
});

describe('waitForNone', () => {
  it('never throws, whatever the signals do', () => {
    const failure = new Error('failed');
    const results = waitForNone([() => 1, pending(), failing(failure)]);
    expect(results[0]).toEqual({ type: 'success', value: 1 });
    expect(results[1].type).toBe('pending');
    expect(results[2]).toEqual({ type: 'failure', value: failure });
  });

  it('returns an empty list for no signals', () => {
    expect(waitForNone([])).toEqual([]);
  });
});

describe('waitForAll', () => {
  it('returns every value once they all resolve', () => {
    expect(waitForAll([() => 1, () => 2])).toEqual([1, 2]);
  });

  it('suspends while any signal is pending', () => {
    expect(() => waitForAll([() => 1, pending()])).toThrow(
      ResourceNotReadyError,
    );
  });

  it('prefers suspending over reporting a failure', () => {
    expect(() => waitForAll([failing(new Error('failed')), pending()])).toThrow(
      ResourceNotReadyError,
    );
  });

  it('throws an AggregateError once every signal has settled', () => {
    const first = new Error('first');
    const second = new Error('second');
    try {
      waitForAll([failing(first), failing(second)]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors).toEqual([first, second]);
    }
  });
});

describe('waitForAny', () => {
  it('returns the first successful value', () => {
    expect(waitForAny([failing(new Error('failed')), () => 2])).toBe(2);
  });

  it('suspends while no signal has succeeded and one is pending', () => {
    expect(() => waitForAny([failing(new Error('failed')), pending()])).toThrow(
      ResourceNotReadyError,
    );
  });

  it('throws an AggregateError once every signal has failed', () => {
    const first = new Error('first');
    const second = new Error('second');
    try {
      waitForAny([failing(first), failing(second)]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors).toEqual([first, second]);
    }
  });
});

describe('waitForRace', () => {
  it('returns the first settled value', () => {
    expect(waitForRace([() => 1, failing(new Error('failed'))])).toBe(1);
  });

  it('throws when the first settled signal failed', () => {
    expect(() => waitForRace([failing(new Error('failed')), () => 1])).toThrow(
      'failed',
    );
  });

  it('suspends while every signal is pending', () => {
    expect(() => waitForRace([pending(), pending()])).toThrow(
      ResourceNotReadyError,
    );
  });
});
