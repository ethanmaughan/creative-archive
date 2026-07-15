import { describe, it, expect } from 'vitest'
import { validateFrontmatter } from '@/domain/services/validate-document'

describe('validateFrontmatter', () => {
  it('accepts valid base frontmatter', () => {
    expect(validateFrontmatter('note', { id: 'n1', title: 'A note', tags: ['x'] }).valid).toBe(true)
  })

  it('accepts valid character frontmatter', () => {
    expect(
      validateFrontmatter('character', { id: 'c1', role: 'protagonist', aliases: ['M'] }).valid,
    ).toBe(true)
  })

  it('accepts a valid library item', () => {
    expect(
      validateFrontmatter('library-item', { id: 'b1', mediaType: 'book', rating: 5 }).valid,
    ).toBe(true)
  })

  it('quarantines (does not throw) a library item missing its media type', () => {
    const result = validateFrontmatter('library-item', { id: 'b1' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.path.includes('mediaType'))).toBe(true)
    }
  })

  it('rejects an out-of-range rating', () => {
    expect(
      validateFrontmatter('library-item', { id: 'b1', mediaType: 'book', rating: 9 }).valid,
    ).toBe(false)
  })

  it('flags a missing id', () => {
    expect(validateFrontmatter('note', { title: 'no id' }).valid).toBe(false)
  })
})
