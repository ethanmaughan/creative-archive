// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseTags, normalizeTag } from '@/domain/services/parse-tags'

describe('parseTags', () => {
  it('extracts inline tags, including nested', () => {
    expect(parseTags('Loves #fantasy and #sci-fi/space here.')).toEqual(['fantasy', 'sci-fi/space'])
  })

  it('does not treat Markdown headings as tags', () => {
    expect(parseTags('# Heading\n## Sub\nbody with a #real tag')).toEqual(['real'])
  })

  it('lowercases and dedupes, and needs a boundary before #', () => {
    expect(parseTags('#Foo #foo #FOO')).toEqual(['foo'])
    expect(parseTags('email me at a#b, not a tag')).toEqual([])
  })

  it('normalizeTag strips a leading # and lowercases', () => {
    expect(normalizeTag('#Fantasy')).toBe('fantasy')
    expect(normalizeTag('  War ')).toBe('war')
  })
})
