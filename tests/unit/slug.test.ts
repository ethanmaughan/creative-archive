import { describe, it, expect } from 'vitest'
import { slugify } from '@/shared/slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('The Glass House')).toBe('the-glass-house')
  })

  it('strips punctuation and trims hyphens', () => {
    expect(slugify('  Mara: Vell!  ')).toBe('mara-vell')
  })

  it('falls back to "untitled" for empty/punctuation-only input', () => {
    expect(slugify('   ')).toBe('untitled')
    expect(slugify('***')).toBe('untitled')
  })
})
