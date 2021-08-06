import * as CSS from 'csstype';

// export interface CSSProperties extends CSS.Properties<string | number> {
export type CSSProperties = CSS.Properties<string | number>;
/**
 * The index signature was removed to enable closed typing for style
 * using CSSType. You're able to use type assertion or module augmentation
 * to add properties or an index signature of your own.
 *
 * For examples and more information, visit:
 * https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
 */
// }
