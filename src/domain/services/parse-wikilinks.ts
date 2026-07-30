/**
 * Parse `[[wikilinks]]` out of a document body. Supports `[[Target]]` and `[[Target|alias]]`.
 * Pure. The reconciler resolves the targets to documents and writes the derived link graph.
 *
 * Deliberately simple (a single regex over the text): it does not exclude fenced code blocks,
 * which is an acceptable MVP limitation. Duplicate targets within one document collapse to a
 * single link (one backlink edge per source→target).
 */

export interface ParsedWikilink {
  /** The target as written, trimmed (e.g. "My Character"). */
  readonly target: string
  /** Optional display alias from `[[Target|alias]]`. */
  readonly alias: string | null
}

const WIKILINK = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g

export function parseWikilinks(body: string): ParsedWikilink[] {
  const seen = new Set<string>()
  const links: ParsedWikilink[] = []
  for (const match of body.matchAll(WIKILINK)) {
    const target = (match[1] ?? '').trim()
    if (target === '') continue
    const key = target.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const rawAlias = match[2]?.trim()
    links.push({ target, alias: rawAlias && rawAlias !== '' ? rawAlias : null })
  }
  return links
}

/** Normalized key used to match a wikilink target to a document (by title or filename). */
export function wikilinkKey(text: string): string {
  return text.trim().toLowerCase()
}
