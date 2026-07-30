// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseWikilinks, wikilinkKey } from '@/domain/services/parse-wikilinks'

describe('parseWikilinks', () => {
  it('extracts targets and aliases', () => {
    const links = parseWikilinks('See [[Mara]] and [[The City|home]].')
    expect(links).toEqual([
      { target: 'Mara', fragment: null, alias: null },
      { target: 'The City', fragment: null, alias: 'home' },
    ])
  })

  it('captures a #fragment (block or heading) and a same-doc [[#^id]]', () => {
    expect(parseWikilinks('ref [[Mara#^a1b2]] and [[Notes#Backstory]] and [[#^self]]')).toEqual([
      { target: 'Mara', fragment: '^a1b2', alias: null },
      { target: 'Notes', fragment: 'Backstory', alias: null },
      { target: '', fragment: '^self', alias: null },
    ])
  })

  it('trims, ignores empties, and dedupes by page+fragment', () => {
    expect(parseWikilinks('[[  Mara  ]] [[mara]] [[]] [[MARA|nick]]')).toEqual([
      { target: 'Mara', fragment: null, alias: null },
    ])
  })

  it('normalizes keys for matching', () => {
    expect(wikilinkKey('  My Character ')).toBe('my character')
  })
})
