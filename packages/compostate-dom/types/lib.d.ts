import { untrack, Ref } from "compostate";
import type { JSX } from "./jsx";
export interface Context {
    id: symbol;
    Provider: (props: any) => any;
    defaultValue: unknown;
}
export declare const untracked: typeof untrack;
export declare function root<T>(fn: (dispose: () => void) => T): T;
export declare function cleanup(fn: () => void): void;
export declare function effect<T>(fn: (prev?: T) => T, current?: T): void;
export declare function memo<T>(fn: () => T, equal?: boolean): () => T;
export declare function createSelector<T, U extends T>(source: () => T, fn?: (a: U, b: T) => boolean): (key: U) => boolean;
declare type PropsWithChildren<P> = P & {
    children?: JSX.Element;
};
export declare type Component<P = {}> = (props: PropsWithChildren<P>) => JSX.Element;
export declare type ComponentProps<T extends keyof JSX.IntrinsicElements | Component<any>> = T extends Component<infer P> ? P : T extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[T] : {};
export declare function createComponent<T>(Comp: Component<T>, props: T): JSX.Element;
export declare function lazy<T extends Function>(fn: () => Promise<{
    default: T;
}>): (props: object) => () => any;
export declare function splitProps<T extends object, K1 extends keyof T>(props: T, ...keys: [K1[]]): [Pick<T, K1>, Omit<T, K1>];
export declare function splitProps<T extends object, K1 extends keyof T, K2 extends keyof T>(props: T, ...keys: [K1[], K2[]]): [Pick<T, K1>, Pick<T, K2>, Omit<T, K1 | K2>];
export declare function splitProps<T extends object, K1 extends keyof T, K2 extends keyof T, K3 extends keyof T>(props: T, ...keys: [K1[], K2[], K3[]]): [Pick<T, K1>, Pick<T, K2>, Pick<T, K3>, Omit<T, K1 | K2 | K3>];
export declare function splitProps<T extends object, K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T>(props: T, ...keys: [K1[], K2[], K3[], K4[]]): [Pick<T, K1>, Pick<T, K2>, Pick<T, K3>, Pick<T, K4>, Omit<T, K1 | K2 | K3 | K4>];
export declare function splitProps<T extends object, K1 extends keyof T, K2 extends keyof T, K3 extends keyof T, K4 extends keyof T, K5 extends keyof T>(props: T, ...keys: [K1[], K2[], K3[], K4[], K5[]]): [
    Pick<T, K1>,
    Pick<T, K2>,
    Pick<T, K3>,
    Pick<T, K4>,
    Pick<T, K5>,
    Omit<T, K1 | K2 | K3 | K4 | K5>
];
export declare function map<T, U>(list: () => T[], mapFn: (v: T, i: Ref<number>) => U): () => U[];
export {};
