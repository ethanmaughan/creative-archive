// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseQuery } from '@/domain/services/parse-query'

describe('parseQuery', () => {
  it('parses whitelisted keys, lowercasing and stripping #', () => {
    expect(parseQuery('kind: Note\ntag: #Fantasy\nsort: -title\nlimit: 5')).toEqual({
      kind: 'note',
      tag: 'fantasy',
      pathPrefix: null,
      sortDir: 'desc',
      limit: 5,
    })
  })

  it('maps space to a path prefix', () => {
    expect(parseQuery('space: my-novel')).toMatchObject({ pathPrefix: 'spaces/my-novel/' })
    expect(parseQuery('path: research')).toMatchObject({ pathPrefix: 'research' })
  })

  it('ignores unknown keys and clamps the limit', () => {
    expect(parseQuery('nonsense\nfoo: bar\nlimit: 999')).toMatchObject({ limit: 100, kind: null })
  })

  it('has sensible defaults for an empty query', () => {
    expect(parseQuery('')).toEqual({
      kind: null,
      tag: null,
      pathPrefix: null,
      sortDir: 'asc',
      limit: 25,
    })
  })
})
