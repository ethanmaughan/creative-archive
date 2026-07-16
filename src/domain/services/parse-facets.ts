/**
 * Extract creative-extraction facets from a document body. Markdown headings whose text
 * names a facet (e.g. "## Techniques") open a section; everything until the next heading is
 * that facet's content. Non-facet headings are ignored. Pure, no IO.
 */
import type { FacetKind } from '../models/extraction'

export interface ParsedFacet {
  readonly facet: FacetKind
  readonly content: string
}

const HEADING_RE = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/

const FACET_ALIASES: Record<string, FacetKind> = {
  review: 'review',
  reviews: 'review',
  technique: 'technique',
  techniques: 'technique',
  theme: 'theme',
  themes: 'theme',
  atmosphere: 'atmosphere',
  imagery: 'imagery',
  dialogue: 'dialogue',
  'dialogue observations': 'dialogue',
  structure: 'structure',
  'structural lessons': 'structure',
  worldbuilding: 'worldbuilding',
  'world-building': 'worldbuilding',
  'worldbuilding ideas': 'worldbuilding',
  note: 'note',
  notes: 'note',
}

export function parseFacets(body: string): ParsedFacet[] {
  const facets: ParsedFacet[] = []
  let current: { facet: FacetKind; lines: string[] } | null = null

  const flush = (): void => {
    if (!current) return
    const content = current.lines.join('\n').trim()
    if (content !== '') facets.push({ facet: current.facet, content })
  }

  for (const line of body.split(/\r?\n/)) {
    const match = HEADING_RE.exec(line)
    if (match) {
      flush()
      const facet = FACET_ALIASES[(match[1] ?? '').toLowerCase()]
      current = facet ? { facet, lines: [] } : null
      continue
    }
    if (current) current.lines.push(line)
  }
  flush()
  return facets
}
