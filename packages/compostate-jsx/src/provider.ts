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

export interface ProviderData {
  parent?: ProviderData;
  data: Record<string, any>;
}

export let PROVIDER: ProviderData | undefined;

export function setProvider(instance: ProviderData | undefined): void {
  PROVIDER = instance;
}

export function provide<T>(provider: Provider<T>, value: T): void {
  const currentProvider = PROVIDER;

  if (currentProvider) {
    currentProvider.data[provider.id] = value;
  }
}

export function inject<T>(provider: Provider<T>): T {
  const currentProvider = PROVIDER;

  function searchProvider(root?: ProviderData): T {
    if (!root) {
      return provider.defaultValue;
    }
    if (provider.id in root.data) {
      return root.data[provider.id] as T;
    }
    return searchProvider(root.parent);
  }

  return searchProvider(currentProvider);
}
