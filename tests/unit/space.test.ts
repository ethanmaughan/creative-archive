// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { SpaceRepository } from '@/data/repositories/space-repository'
import { DocumentRepository } from '@/data/repositories/document-repository'
import { classifyKind } from '@/domain/models/workspace'
import {
  docKindsForSpaceType,
  spaceSlugFromPath,
  subfolderForSpaceKind,
} from '@/domain/models/space'

describe('space classification + helpers', () => {
  it('classifies files inside a space by subfolder', () => {
    expect(classifyKind('spaces/my-novel/space.md')).toBe('space')
    expect(classifyKind('spaces/my-novel/manuscript/010-open.md')).toBe('manuscript')
    expect(classifyKind('spaces/my-novel/scenes/duel.md')).toBe('scene')
    expect(classifyKind('spaces/cs101/notes/week-1.md')).toBe('note')
    expect(classifyKind('spaces/my-novel/world-rules/magic.md')).toBe('world-rule')
    expect(classifyKind('spaces/cs101/docs/syllabus.md')).toBe('document')
  })

  it('extracts the slug from a space path', () => {
    expect(spaceSlugFromPath('spaces/cs101/notes/a.md')).toBe('cs101')
    expect(spaceSlugFromPath('spaces/cs101')).toBe('cs101')
    expect(spaceSlugFromPath('library/book/dune.md')).toBeNull()
  })

  it('offers writing kinds for writing spaces, lighter kinds otherwise', () => {
    expect(docKindsForSpaceType('writing')).toContain('manuscript')
    expect(docKindsForSpaceType('study')).not.toContain('manuscript')
    expect(subfolderForSpaceKind('manuscript')).toBe('manuscript')
    expect(subfolderForSpaceKind('scene')).toBe('scenes')
  })
})

describe('SpaceRepository', () => {
  let db: Sqlite
  const now = (): string => '2026-01-01T00:00:00Z'

  beforeEach(async () => {
    db = await openInMemory()
    applyMigrations(db, MIGRATIONS)
  })

  it('lists spaces with their type and document count', async () => {
    const fs = new MemoryFileStore({
      'spaces/my-novel/space.md': '---\nid: s1\ntitle: My Novel\nspaceType: writing\n---\n',
      'spaces/my-novel/manuscript/010-open.md': '---\nid: c1\ntitle: Opening\n---\ntext\n',
      'spaces/my-novel/notes/idea.md': '---\nid: n1\ntitle: Idea\n---\n.\n',
      'spaces/cs101/space.md': '---\nid: s2\ntitle: CS 101\nspaceType: study\n---\n',
      'library/book/dune.md': '---\nid: b1\ntitle: Dune\nmediaType: book\n---\n.\n', // shared, not a space
    })
    await reconcile(fs, db, { now })

    const spaces = new SpaceRepository(db).all()
    expect(spaces.map((s) => s.slug)).toEqual(['cs101', 'my-novel']) // ordered by title
    const novel = spaces.find((s) => s.slug === 'my-novel')
    expect(novel?.spaceType).toBe('writing')
    expect(novel?.docCount).toBe(2) // the two docs, not the space.md marker
    expect(spaces.find((s) => s.slug === 'cs101')?.spaceType).toBe('study')
  })

  it('scopes document search to a single space via path prefix', async () => {
    const fs = new MemoryFileStore({
      'spaces/a/notes/x.md': '---\nid: x\ntitle: X\n---\ndragons everywhere\n',
      'spaces/b/notes/y.md': '---\nid: y\ntitle: Y\n---\ndragons elsewhere\n',
    })
    await reconcile(fs, db, { now })
    const docs = new DocumentRepository(db)
    const all = docs.search('dragons')
    expect(all).toHaveLength(2)
    const scoped = docs.search('dragons', { pathPrefix: 'spaces/a/' })
    expect(scoped.map((d) => d.relPath)).toEqual(['spaces/a/notes/x.md'])
  })
})
