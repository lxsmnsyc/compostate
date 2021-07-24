export interface Derived<T> {
  derive: () => T;
}

export function derived<T>(value: () => T): Derived<T> {
  return { derive: value };
}
