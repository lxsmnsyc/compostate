import computed from './computed';
import effect from './effect';
import reactive from './reactive';

export interface ResourcePending<T> {
  status: 'pending';
  value: Promise<T>;
}

export interface ResourceFailure {
  status: 'failure';
  value: any;
}

export interface ResourceSuccess<T> {
  status: 'success';
  value: T;
}

export type Resource<T> =
  | ResourcePending<T>
  | ResourceFailure
  | ResourceSuccess<T>;

export default function resource<T>(
  fetcher: () => Promise<T>,
): Resource<T> {
  const promise = computed(() => fetcher());

  const state = reactive<Resource<T>>({
    status: 'pending',
    value: promise.value,
  });

  effect(() => {
    let alive = true;

    state.status = 'pending';
    state.value = promise.value;

    promise.value.then(
      (value) => {
        if (alive) {
          state.status = 'success';
          state.value = value;
        }
      },
      (value: any) => {
        if (alive) {
          state.status = 'failure';
          state.value = value;
        }
      },
    );

    return () => {
      alive = false;
    };
  });

  return state;
}
