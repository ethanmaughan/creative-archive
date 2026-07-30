// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseWikilinks, wikilinkKey } from '@/domain/services/parse-wikilinks'

describe('parseWikilinks', () => {
  it('extracts targets and aliases', () => {
    const links = parseWikilinks('See [[Mara]] and [[The City|home]].')
    expect(links).toEqual([
      { target: 'Mara', alias: null },
      { target: 'The City', alias: 'home' },
    ])
  })

  it('trims, ignores empties, and dedupes by target (case-insensitive)', () => {
    const links = parseWikilinks('[[  Mara  ]] [[mara]] [[]] [[MARA|nick]]')
    expect(links).toEqual([{ target: 'Mara', alias: null }])
  })

  it('returns nothing when there are no wikilinks', () => {
    expect(parseWikilinks('plain text, [not a link], (also not)')).toEqual([])
  })

  it('normalizes keys for matching', () => {
    expect(wikilinkKey('  My Character ')).toBe('my character')
  })
})
