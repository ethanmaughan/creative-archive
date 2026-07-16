import { describe, it, expect } from 'vitest'
import { parseFacets } from '@/domain/services/parse-facets'

describe('parseFacets', () => {
  it('extracts facet sections by heading', () => {
    const body =
      '# Dune\nIntro.\n## Techniques\nUnreliable narrator.\nForeshadowing.\n## Themes\nPower and ecology.\n'
    expect(parseFacets(body)).toEqual([
      { facet: 'technique', content: 'Unreliable narrator.\nForeshadowing.' },
      { facet: 'theme', content: 'Power and ecology.' },
    ])
  })

  it('ignores non-facet headings', () => {
    const body = '## Summary\nblah blah\n## Imagery\nDesert light.\n'
    expect(parseFacets(body)).toEqual([{ facet: 'imagery', content: 'Desert light.' }])
  })

  it('maps plural and phrase aliases', () => {
    const body = '## Structural lessons\nThree-act spine.\n## World-building\nSpice economy.\n'
    expect(parseFacets(body)).toEqual([
      { facet: 'structure', content: 'Three-act spine.' },
      { facet: 'worldbuilding', content: 'Spice economy.' },
    ])
  })

  it('returns nothing when there are no facet sections', () => {
    expect(parseFacets('Just prose, no headings at all.')).toEqual([])
  })
})
