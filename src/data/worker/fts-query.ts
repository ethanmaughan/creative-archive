/** Normalized alphanumeric search terms (lowercased, punctuation stripped). */
export function queryTerms(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length > 0)
}

/** Turn free-text into a safe FTS5 MATCH query: terms prefix-matched and ANDed.
 *  Prevents raw punctuation (a lone quote, `*`, etc.) from throwing an FTS syntax error. */
export function toFtsQuery(raw: string): string {
  return queryTerms(raw)
    .map((t) => `${t}*`)
    .join(' ')
}

/** Build a short excerpt of `body` around the first matching term (contentless FTS can't
 *  produce snippets, so we do it from the file body). Whitespace is collapsed. */
export function buildSnippet(body: string, terms: readonly string[], radius = 90): string {
  const text = body.replace(/\s+/g, ' ').trim()
  if (text === '') return ''
  const lower = text.toLowerCase()
  let index = -1
  for (const term of terms) {
    const found = lower.indexOf(term)
    if (found !== -1 && (index === -1 || found < index)) index = found
  }
  if (index === -1) {
    return text.length > radius * 2 ? `${text.slice(0, radius * 2)}…` : text
  }
  const start = Math.max(0, index - radius)
  const end = Math.min(text.length, index + radius)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}
