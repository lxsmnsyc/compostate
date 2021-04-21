import { State } from 'compostate';
import { useDebugValue } from 'react';
import { useStoreAdapter } from 'react-store-adapter';
import { useCompostateCore, useCompostateRestriction } from '../CompostateCore';

export default function useCompostate<S>(state: State<S>): S {
  useCompostateRestriction();

  const value = useStoreAdapter(useCompostateCore().get(state));

  useDebugValue(value);

  return value;
}
