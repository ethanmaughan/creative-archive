import { describe, it, expect } from 'vitest'
import {
  parseFrontmatter,
  serializeFrontmatter,
  ensureId,
} from '@/data/storage/file-store/frontmatter'

describe('frontmatter', () => {
  it('parses frontmatter and body', () => {
    const raw = `---\ntitle: Dune\ntags: [sf, classic]\n---\nBody text here.\n`
    const parsed = parseFrontmatter(raw)
    expect(parsed.hadFrontmatter).toBe(true)
    expect(parsed.data['title']).toBe('Dune')
    expect(parsed.data['tags']).toEqual(['sf', 'classic'])
    expect(parsed.body).toBe('Body text here.\n')
  })

  it('treats a file without frontmatter as all body', () => {
    const raw = 'Just prose, no frontmatter.\n'
    const parsed = parseFrontmatter(raw)
    expect(parsed.hadFrontmatter).toBe(false)
    expect(parsed.data).toEqual({})
    expect(parsed.body).toBe(raw)
  })

  it('round-trips parse -> serialize -> parse', () => {
    const out = serializeFrontmatter({ title: 'Scene 1' }, 'Once upon a time.\n')
    const reparsed = parseFrontmatter(out)
    expect(reparsed.data['title']).toBe('Scene 1')
    expect(reparsed.body).toBe('Once upon a time.\n')
  })

  it('injects a uuid when id is missing', () => {
    const result = ensureId({ title: 'X' }, () => 'fixed-id')
    expect(result.added).toBe(true)
    expect(result.id).toBe('fixed-id')
    expect(result.data['id']).toBe('fixed-id')
  })

  it('keeps an existing id', () => {
    const result = ensureId({ id: 'keep-me', title: 'X' }, () => 'unused')
    expect(result.added).toBe(false)
    expect(result.id).toBe('keep-me')
  })
})
