import type { JSX } from 'react';
import type { CompostateSetup } from './use-setup';
import useCompostateSetup from './use-setup';

export default function defineComponent<Props extends Record<string, any>>(
  setup: CompostateSetup<Props, JSX.Element>,
): (props: Props) => JSX.Element {
  return (props: Props): JSX.Element => useCompostateSetup(setup, props);
}
