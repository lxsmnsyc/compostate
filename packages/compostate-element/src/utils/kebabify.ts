export default function kebabify(str: string): string {
  return str.replace(/([A-Z])([A-Z])/g, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')            
    .toLowerCase();
}
