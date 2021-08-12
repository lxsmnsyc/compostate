import { contextual, errorBoundary, resource } from 'compostate';
import { derived } from './reactivity';
import { suspend } from './suspense';
import { VComponent } from './types';

export function withContext<P>(comp: VComponent<P>): VComponent<P> {
  return (props) => contextual(() => comp(props));
}

export function withErrorBoundary<P>(comp: VComponent<P>): VComponent<P> {
  return (props) => errorBoundary(() => comp(props));
}

export function lazy<P>(mod: () => Promise<VComponent<P>>): VComponent<P> {
  return (props) => {
    const data = resource(mod);

    suspend(data);

    return derived(() => {
      if (data.status === 'success') {
        return data.value(props);
      }
      return undefined;
    });
  };
}
