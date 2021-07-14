import batch from './batch';
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

export interface ResourceOptions<T> {
  initialValue?: T;
  timeoutMS?: number;
}

export default function resource<T>(
  fetcher: () => Promise<T>,
  options: ResourceOptions<T> = {},
): Resource<T> {
  const promise = computed(() => fetcher());

  const baseState: Resource<T> = options.initialValue != null
    ? { status: 'success', value: options.initialValue }
    : { status: 'pending', value: promise.value };

  const state = reactive<Resource<T>>(baseState);

  effect(() => {
    let alive = true;

    const stop = effect(() => {
      // If there's a transition timeout,
      // do not fallback to pending state.
      if (options.timeoutMS) {
        const timeout = setTimeout(() => {
          // Resolution takes too long,
          // fallback to pending state.
          batch(() => {
            state.status = 'pending';
            state.value = promise.value;
          });
        }, options.timeoutMS);

        return () => {
          clearTimeout(timeout);
        };
      }
      state.status = 'pending';
      state.value = promise.value;
      return undefined;
    });

    promise.value.then(
      (value) => {
        if (alive) {
          stop();
          batch(() => {
            state.status = 'success';
            state.value = value;
          });
        }
      },
      (value: any) => {
        if (alive) {
          stop();
          batch(() => {
            state.status = 'failure';
            state.value = value;
          });
        }
      },
    );

    return () => {
      alive = false;
    };
  });

  return state;
}
