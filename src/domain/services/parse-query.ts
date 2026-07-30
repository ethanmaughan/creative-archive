/**
 * A tiny, SAFE query language for inline ` ```query ` blocks — our answer to Dataview, without
 * arbitrary code. Declarative `key: value` lines only; unknown keys are ignored. The structured
 * result is turned into a parameterized SQL query over the index (no interpolation of values).
 *
 * Supported keys:
 *   kind: note            — filter by document kind
 *   tag: fantasy          — has this tag (leading # optional)
 *   space: my-novel       — inside this space (path prefix spaces/<slug>/)
 *   path: research        — path prefix
 *   sort: title | -title  — by title, ascending or (with -) descending
 *   limit: 20             — 1..100 (default 25)
 */

export interface ParsedQuery {
  readonly kind: string | null
  readonly tag: string | null
  readonly pathPrefix: string | null
  readonly sortDir: 'asc' | 'desc'
  readonly limit: number
}

const LINE = /^(\w+)\s*:\s*(.+)$/

export function parseQuery(text: string): ParsedQuery {
  let kind: string | null = null
  let tag: string | null = null
  let pathPrefix: string | null = null
  let sortDir: 'asc' | 'desc' = 'asc'
  let limit = 25

  for (const raw of text.split('\n')) {
    const match = LINE.exec(raw.trim())
    if (!match) continue
    const key = (match[1] ?? '').toLowerCase()
    const value = (match[2] ?? '').trim()
    if (value === '') continue
    switch (key) {
      case 'kind':
        kind = value.toLowerCase()
        break
      case 'tag':
        tag = value.replace(/^#/, '').toLowerCase()
        break
      case 'space':
        pathPrefix = `spaces/${value}/`
        break
      case 'path':
        pathPrefix = value
        break
      case 'sort':
        sortDir = value.startsWith('-') ? 'desc' : 'asc'
        break
      case 'limit': {
        const n = Number.parseInt(value, 10)
        if (Number.isFinite(n)) limit = Math.max(1, Math.min(100, n))
        break
      }
      default:
        break
    }
  }
  return { kind, tag, pathPrefix, sortDir, limit }
}
