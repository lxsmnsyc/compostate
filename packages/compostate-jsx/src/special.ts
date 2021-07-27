import { Ref } from 'compostate';
import {
  VFor, VFragment, VNode, VOffscreen, VPortal, VSuspense,
} from './types';

export interface FragmentProps {
  children?: VNode[];
}

export interface SuspenseProps {
  fallback?: () => VNode;
  render?: () => VNode;
}

export interface PortalProps {
  target: HTMLElement;
  children?: VNode;
}

export interface OffscreenProps {
  mount?: boolean;
  render?: () => VNode;
}

export interface ForProps<T> {
  in: T[];
  each: (item: T, index: Ref<number>) => VNode;
}

export const Fragment: VFragment = 1;
export const Suspense: VSuspense = 2;
export const Offscreen: VOffscreen = 3;
export const Portal: VPortal = 4;
export const For: VFor = 5;

// Considerations

// export interface ErrorBoundaryProps {
//   onError?: (error: Error, reset: () => void) => void;
//   fallback?: VNode;
//   children?: VNode;
// }

// export interface ProviderProps<T> {
//   provider: Provider<T>;
//   value: T;
// }

// export const ErrorBoundary: VErrorBoundary = 255;
// export const Provider: VProvider = 254;
