/** @jsx h */
import { h } from 'preact';
import { render, act } from '@testing-library/preact';
import { state } from 'compostate';

import { CompostateRoot, useCompostate } from '../src';

import { supressWarnings, restoreWarnings } from './suppress-warnings';

import '@testing-library/jest-dom';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useCompostate', () => {
  it('should throw an error when used without CompostateRoot', () => {
    const example = state(() => 0);

    function Consumer(): JSX.Element {
      const value = useCompostate(example);

      return <h1>{value}</h1>;
    }

    supressWarnings();
    expect(() => {
      render(<Consumer />);
    }).toThrowError();
    restoreWarnings();
  });
  it('should receive the correct state on initial render', () => {
    const expected = 'Expected';
    const example = state(() => expected);

    function Consumer(): JSX.Element {
      const value = useCompostate(example);

      return <h1 title="example">{value}</h1>;
    }

    const result = render((
      <CompostateRoot>
        <Consumer />
      </CompostateRoot>
    ));

    expect(result.getByTitle('example')).toContainHTML(expected);
  });
  it('should receive the updated state', async () => {
    const example = state(() => 'Initial');

    function Consumer(): JSX.Element {
      const value = useCompostate(example);

      return <h1 title="example">{value}</h1>;
    }

    const result = render((
      <CompostateRoot>
        <Consumer />
      </CompostateRoot>
    ));

    expect(result.getByTitle('example')).toContainHTML('Initial');
    example.value = 'Updated';
    await act(() => {
      jest.runAllTimers();
    });
    expect(result.getByTitle('example')).toContainHTML('Updated');
  });
});
