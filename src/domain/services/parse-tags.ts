/**
 * Parse inline `#tags` from a document body. Pure. Tags are lowercased for case-insensitive
 * matching, allow nesting (`#story/theme`), and must start with a letter or digit.
 *
 * A `#` that starts a Markdown heading (`# Heading`) is NOT a tag: headings put a space after
 * the `#`, so requiring an alphanumeric immediately after `#` excludes them. The `#` must also
 * sit on a word boundary (not `word#x`, not the second `#` of `##`).
 */
const TAG = /(?<![\w#])#([a-z0-9][\w\-/]*)/gi

export function parseTags(body: string): string[] {
  const tags = new Set<string>()
  for (const match of body.matchAll(TAG)) {
    const name = (match[1] ?? '').toLowerCase()
    if (name !== '') tags.add(name)
  }
  return [...tags]
}

/** Normalize a tag name (from frontmatter or inline) to its canonical, lowercased form. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#/, '').toLowerCase()
}
