import { computed, effect, Ref } from 'compostate';
import Context from './context';

export interface Provider<T> {
  readonly id: string;
  readonly defaultValue: T;
}

let ID = 0;

export function createProvider<T>(defaultValue: T): Provider<T> {
  const currentID = ID;
  ID += 1;
  return {
    id: `${currentID}`,
    defaultValue,
  };
}

interface ProviderData {
  parent?: ProviderData;
  data: Record<string, any>;
}

export const PROVIDER = new Context<ProviderData | undefined>();

export function provide<T>(provider: Provider<T>, value: Ref<T>): void {
  const currentProvider = PROVIDER.getContext();

  effect(() => {
    if (currentProvider) {
      currentProvider.data[provider.id] = value.value;
    }
  });
}

export function inject<T>(provider: Provider<T>): Ref<T> {
  const currentProvider = PROVIDER.getContext();

  function searchProvider(root?: ProviderData): T {
    if (!root) {
      return provider.defaultValue;
    }
    if (provider.id in root.data) {
      return root.data[provider.id] as T;
    }
    return searchProvider(root.parent);
  }

  return computed(() => searchProvider(currentProvider));
}
