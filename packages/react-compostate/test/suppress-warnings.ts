/* eslint-disable no-console */
const actualError = console.error;

const ENABLED = true;

function defaultError(): void {
  // Consume
}

export function supressWarnings(): void {
  if (ENABLED) {
    console.error = defaultError;
  }
}

export function restoreWarnings(): void {
  if (ENABLED) {
    console.error = actualError;
  }
}
