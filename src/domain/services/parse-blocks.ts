/**
 * Parse referenceable anchors out of a document body:
 *   - **block IDs**: a trailing `^id` marker on a line (Obsidian-style) → `{ type: 'block' }`.
 *   - **headings**: `# Heading` lines → `{ type: 'heading' }`, anchored by a normalized slug.
 *
 * Pure. The reconciler stores these so `[[Doc#^id]]` / `[[Doc#Heading]]` references resolve.
 */

export type AnchorType = 'block' | 'heading'

export interface ParsedBlock {
  /** The `^id` (without the caret) or the heading slug. */
  readonly anchor: string
  readonly type: AnchorType
  /** The block/heading text, marker stripped — for context and (later) embeds. */
  readonly text: string
}

const HEADING = /^#{1,6}\s+(.*\S)\s*$/
const BLOCK_ID = /^(.*\S)\s+\^([a-z0-9][a-z0-9-]*)\s*$/i

/** Normalize heading text to an anchor slug (case-insensitive match against `[[Doc#Heading]]`). */
export function headingSlug(text: string): string {
  return text.trim().toLowerCase()
}

export function parseBlocks(body: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = []
  const seen = new Set<string>()
  for (const line of body.split('\n')) {
    const heading = HEADING.exec(line)
    if (heading) {
      const text = (heading[1] ?? '').trim()
      const anchor = headingSlug(text)
      const key = `heading:${anchor}`
      if (anchor !== '' && !seen.has(key)) {
        seen.add(key)
        blocks.push({ anchor, type: 'heading', text })
      }
      continue
    }
    const block = BLOCK_ID.exec(line)
    if (block) {
      const anchor = (block[2] ?? '').toLowerCase()
      const key = `block:${anchor}`
      if (anchor !== '' && !seen.has(key)) {
        seen.add(key)
        blocks.push({ anchor, type: 'block', text: (block[1] ?? '').trim() })
      }
    }
  }
  return blocks
}

/** Split a wikilink target into its page part and optional `#fragment`. */
export function splitFragment(target: string): { page: string; fragment: string | null } {
  const hash = target.indexOf('#')
  if (hash < 0) return { page: target.trim(), fragment: null }
  return { page: target.slice(0, hash).trim(), fragment: target.slice(hash + 1).trim() || null }
}

/** Resolve a reference fragment to an anchor lookup: `^id` → block, else heading slug. */
export function fragmentAnchor(fragment: string): { anchor: string; type: AnchorType } {
  if (fragment.startsWith('^')) return { anchor: fragment.slice(1).toLowerCase(), type: 'block' }
  return { anchor: headingSlug(fragment), type: 'heading' }
}

/** A heading section: the heading line plus everything until the next same-or-higher heading.
 *  Used to embed `![[Doc#Heading]]`. Returns '' if the heading isn't found. */
export function extractHeadingSection(body: string, heading: string): string {
  const slug = headingSlug(heading)
  const lines = body.split('\n')
  let start = -1
  let level = 0
  for (let i = 0; i < lines.length; i++) {
    const match = /^(#{1,6})\s+(.*\S)\s*$/.exec(lines[i] ?? '')
    if (match && headingSlug(match[2] ?? '') === slug) {
      start = i
      level = (match[1] ?? '').length
      break
    }
  }
  if (start < 0) return ''
  const out = [lines[start] ?? '']
  for (let i = start + 1; i < lines.length; i++) {
    const match = /^(#{1,6})\s/.exec(lines[i] ?? '')
    if (match && (match[1] ?? '').length <= level) break
    out.push(lines[i] ?? '')
  }
  return out.join('\n').trim()
}
