const CONSECUTIVE_UPPER = /([A-Z])([A-Z])/g;
const LOWER_THEN_UPPER = /([a-z])([A-Z])/g;
const SEPARATORS = /[\s_]+/g;

export default function kebabify(str: string): string {
  return str
    .replace(CONSECUTIVE_UPPER, '$1-$2')
    .replace(LOWER_THEN_UPPER, '$1-$2')
    .replace(SEPARATORS, '-')
    .toLowerCase();
}
