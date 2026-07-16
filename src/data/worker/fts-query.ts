/** Turn free-text into a safe FTS5 MATCH query: alphanumeric terms, prefix-matched, ANDed.
 *  Prevents raw punctuation (a lone quote, `*`, etc.) from throwing an FTS syntax error. */
export function toFtsQuery(raw: string): string {
  const terms = raw
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((t) => t.length > 0)
  return terms.map((t) => `${t}*`).join(' ')
}
