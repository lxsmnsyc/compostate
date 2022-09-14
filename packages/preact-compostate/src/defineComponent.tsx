import { JSX } from 'preact';
import useCompostateSetup, { CompostateSetup } from './useCompostateSetup';

export default function defineComponent<Props extends Record<string, any>>(
  setup: CompostateSetup<Props, JSX.Element>,
) {
  return (props: Props): JSX.Element => useCompostateSetup(setup, props);
}
