import { describe, expect, it } from 'vitest';
import {
  atom,
  contextual,
  createContext,
  readContext,
  syncEffect,
  writeContext,
} from '../../src';

describe('context', () => {
  it('falls back to the default value', () => {
    const context = createContext('default');
    expect(readContext(context)).toBe('default');
  });

  it('reads back the written value inside the same tree', () => {
    const context = createContext('default');
    contextual(() => {
      writeContext(context, 'written');
      expect(readContext(context)).toBe('written');
    });
  });

  it('does not leak the written value out of the tree', () => {
    const context = createContext('default');
    contextual(() => {
      writeContext(context, 'written');
    });
    expect(readContext(context)).toBe('default');
  });

  it('reads through to the parent tree', () => {
    const context = createContext('default');
    contextual(() => {
      writeContext(context, 'outer');
      contextual(() => {
        expect(readContext(context)).toBe('outer');
      });
    });
  });

  it('lets a nested tree shadow the parent value', () => {
    const context = createContext('default');
    contextual(() => {
      writeContext(context, 'outer');
      contextual(() => {
        writeContext(context, 'inner');
        expect(readContext(context)).toBe('inner');
      });
      expect(readContext(context)).toBe('outer');
    });
  });

  it('keeps separate contexts apart', () => {
    const first = createContext('first');
    const second = createContext('second');
    contextual(() => {
      writeContext(first, 'written');
      expect(readContext(second)).toBe('second');
    });
  });

  it('is visible to effects created inside the tree', () => {
    const context = createContext('default');
    const value = atom(1);
    const seen: string[] = [];
    contextual(() => {
      writeContext(context, 'written');
      syncEffect(() => {
        value();
        seen.push(readContext(context));
      });
    });
    value(2);
    expect(seen).toEqual(['written', 'written']);
  });

  it('returns the value of its callback', () => {
    expect(contextual(() => 'value')).toBe('value');
  });
});
