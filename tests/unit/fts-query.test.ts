import { describe, it, expect } from 'vitest'
import { buildSnippet, queryTerms, toFtsQuery } from '@/data/worker/fts-query'

describe('toFtsQuery', () => {
  it('prefix-matches each term', () => {
    expect(toFtsQuery('spice worm')).toBe('spice* worm*')
  })

  it('strips punctuation that would break FTS syntax', () => {
    expect(toFtsQuery('"hello" world!')).toBe('hello* world*')
  })

  it('returns empty for blank or punctuation-only input', () => {
    expect(toFtsQuery('   ')).toBe('')
    expect(toFtsQuery('***')).toBe('')
  })
})

describe('queryTerms', () => {
  it('normalizes to lowercase alphanumeric terms', () => {
    expect(queryTerms('  Spice, WORMS! ')).toEqual(['spice', 'worms'])
  })
})

describe('buildSnippet', () => {
  it('excerpts around the first matching term', () => {
    const body =
      'The desert planet Arrakis is the only source of the spice melange in the universe.'
    const snippet = buildSnippet(body, ['spice'], 20)
    expect(snippet).toContain('spice')
    expect(snippet.startsWith('…')).toBe(true)
    expect(snippet.endsWith('…')).toBe(true)
  })

  it('collapses whitespace and falls back to the start when no term matches', () => {
    expect(buildSnippet('a\n\n  b   c', [], 10)).toBe('a b c')
    expect(buildSnippet('hello world', ['zzz'], 100)).toBe('hello world')
  })

  it('returns empty for an empty body', () => {
    expect(buildSnippet('', ['x'])).toBe('')
  })
})
