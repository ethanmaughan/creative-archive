/**
 * Parse `[[wikilinks]]` out of a document body. Supports `[[Target]]` and `[[Target|alias]]`.
 * Pure. The reconciler resolves the targets to documents and writes the derived link graph.
 *
 * Deliberately simple (a single regex over the text): it does not exclude fenced code blocks,
 * which is an acceptable MVP limitation. Duplicate targets within one document collapse to a
 * single link (one backlink edge per source→target).
 */

export interface ParsedWikilink {
  /** The page part of the target, trimmed (e.g. "My Character"); empty for a same-doc `[[#^id]]`. */
  readonly target: string
  /** A `#fragment` — `^id` (block) or heading text — or null. */
  readonly fragment: string | null
  /** Optional display alias from `[[Target|alias]]`. */
  readonly alias: string | null
}

const WIKILINK = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g

export function parseWikilinks(body: string): ParsedWikilink[] {
  const seen = new Set<string>()
  const links: ParsedWikilink[] = []
  for (const match of body.matchAll(WIKILINK)) {
    const raw = (match[1] ?? '').trim()
    const hash = raw.indexOf('#')
    const target = (hash < 0 ? raw : raw.slice(0, hash)).trim()
    const fragment = hash < 0 ? null : raw.slice(hash + 1).trim() || null
    if (target === '' && fragment === null) continue // `[[]]`
    const key = `${target.toLowerCase()}#${fragment ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    const rawAlias = match[2]?.trim()
    links.push({ target, fragment, alias: rawAlias && rawAlias !== '' ? rawAlias : null })
  }
  return links
}

/** Normalized key used to match a wikilink target to a document (by title or filename). */
export function wikilinkKey(text: string): string {
  return text.trim().toLowerCase()
}
