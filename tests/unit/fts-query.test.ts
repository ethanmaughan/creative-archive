import { describe, it, expect } from 'vitest'
import { toFtsQuery } from '@/data/worker/fts-query'

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
