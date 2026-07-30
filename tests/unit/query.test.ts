// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { DocumentRepository } from '@/data/repositories/document-repository'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

function titles(rows: { title: string | null }[]): (string | null)[] {
  return rows.map((r) => r.title)
}

describe('DocumentRepository.query', () => {
  beforeEach(async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md': '---\nid: a\ntitle: Alpha\n---\n#fantasy\n',
      'notebook/b.md': '---\nid: b\ntitle: Bravo\n---\nplain note\n',
      'research/c.md': '---\nid: c\ntitle: Charlie\n---\n#fantasy\n',
    })
    await reconcile(fs, db, { now })
  })

  it('filters by kind', () => {
    expect(titles(new DocumentRepository(db).query({ kind: 'note' }))).toEqual(['Alpha', 'Bravo'])
  })

  it('filters by tag', () => {
    expect(titles(new DocumentRepository(db).query({ tag: 'fantasy' }))).toEqual([
      'Alpha',
      'Charlie',
    ])
  })

  it('filters by path prefix', () => {
    expect(titles(new DocumentRepository(db).query({ pathPrefix: 'research/' }))).toEqual([
      'Charlie',
    ])
  })

  it('sorts descending and honors the limit', () => {
    expect(titles(new DocumentRepository(db).query({ sortDir: 'desc' }))).toEqual([
      'Charlie',
      'Bravo',
      'Alpha',
    ])
    expect(new DocumentRepository(db).query({ limit: 1 })).toHaveLength(1)
  })
})
