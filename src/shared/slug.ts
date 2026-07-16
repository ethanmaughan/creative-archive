/** Filesystem-safe slug from a title. Unicode letters/numbers kept, everything else → '-'. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return base.length > 0 ? base.slice(0, 60) : 'untitled'
}
