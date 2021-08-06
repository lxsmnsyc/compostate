import { Ref } from 'compostate';

export default function unwrapRef<T>(baseRef: T | Ref<T>): T {
  if (baseRef && typeof baseRef === 'object' && 'value' in baseRef) {
    return baseRef.value;
  }
  return baseRef;
}
