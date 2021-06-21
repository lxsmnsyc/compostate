export default function kebabify(str: string): string {
  return str.replace(/[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g, (match) => `-${match.toLowerCase()}`);
}
