export function IS_EQUAL(a: unknown, b: unknown) {
  return a === b || (a !== a && b !== b);
}

export function NO_OP(): void {
  // no-op
}
