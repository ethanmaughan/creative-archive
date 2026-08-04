/**
 * Extract the *context lines* in which a document references a target — the actual line(s)
 * where a `[[wikilink]]` to that target appears. Pure; used to give "linked references" a
 * Logseq-style preview (you see the sentence, not just the source title).
 *
 * `keys` are the accepted target keys (already lowercased via `wikilinkKey`) — a document's
 * title and filename, or a bare topic name. A line matches if it contains a `[[link]]` whose
 * page part resolves to one of those keys. Same-line duplicates and repeat lines collapse.
 */
import { wikilinkKey } from './parse-wikilinks'

const WIKILINK = /\[\[([^[\]|]+)(?:\|[^[\]]+)?\]\]/g

export function extractLinkContexts(body: string, keys: ReadonlySet<string>, max = 5): string[] {
  if (keys.size === 0) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const rawLine of body.split(/\r?\n/)) {
    let hit = false
    for (const match of rawLine.matchAll(WIKILINK)) {
      const raw = (match[1] ?? '').trim()
      const hash = raw.indexOf('#')
      const page = (hash < 0 ? raw : raw.slice(0, hash)).trim()
      if (page !== '' && keys.has(wikilinkKey(page))) {
        hit = true
        break
      }
    }
    if (!hit) continue
    // Strip a leading list/quote/heading marker so the snippet reads as prose.
    const trimmed = rawLine.trim().replace(/^(?:[-*+]\s+|>\s+|#{1,6}\s+)/, '')
    if (trimmed === '' || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
    if (out.length >= max) break
  }
  return out
}
