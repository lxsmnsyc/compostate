import type { JSX } from "./jsx";
export declare function root<T>(fn: (dispose: () => void) => T): undefined;
export declare function effect<T>(fn: (prev?: T) => T, current?: T): void;
export declare function memo<T>(fn: () => T, equal?: boolean): () => T;
declare type PropsWithChildren<P> = P & {
    children?: JSX.Element;
};
export declare type Component<P = {}> = (props: PropsWithChildren<P>) => JSX.Element;
export declare type ComponentProps<T extends keyof JSX.IntrinsicElements | Component<any>> = T extends Component<infer P> ? P : T extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[T] : {};
export declare function createComponent<T>(Comp: Component<T>, props: T): JSX.Element;
export declare function withContext<P>(comp: Component<P>): Component<P>;
export declare function lazy<P>(mod: () => Promise<Component<P>>): Component<P>;
export {};
