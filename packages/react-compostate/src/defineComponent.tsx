import useCompostateSetup, { CompostateSetup } from './useCompostateSetup';

export default function defineComponent<Props>(
  setup: CompostateSetup<Props, JSX.Element>,
) {
  return (props: Props): JSX.Element => useCompostateSetup(setup, props);
}
