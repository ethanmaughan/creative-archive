// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { LibraryRepository } from '@/data/repositories/library-repository'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

describe('library projection', () => {
  it('populates library_items for a valid library document', async () => {
    const fs = new MemoryFileStore({
      'library/book/dune.md':
        '---\nid: b1\ntitle: Dune\nmediaType: book\ncreator: Frank Herbert\nyear: 1965\nrating: 5\n---\nSpice.\n',
    })
    await reconcile(fs, db, { now })
    const items = new LibraryRepository(db).all()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      title: 'Dune',
      mediaType: 'book',
      creator: 'Frank Herbert',
      year: 1965,
      rating: 5,
    })
  })

  it('quarantines (indexes the doc, skips the projection) when mediaType is invalid', async () => {
    const fs = new MemoryFileStore({
      'library/book/mystery.md': '---\nid: b2\ntitle: Mystery\n---\nNo media type.\n',
    })
    await reconcile(fs, db, { now })
    expect(db.selectRows<{ n: number }>('SELECT count(*) AS n FROM documents;')[0]?.n).toBe(1)
    expect(new LibraryRepository(db).all()).toHaveLength(0)
  })

  it('drops the projection row when the file is deleted', async () => {
    const fs = new MemoryFileStore({
      'library/book/dune.md': '---\nid: b1\ntitle: Dune\nmediaType: book\n---\nx.\n',
    })
    await reconcile(fs, db, { now })
    expect(new LibraryRepository(db).all()).toHaveLength(1)
    await fs.deleteFile('library/book/dune.md')
    await reconcile(fs, db, { now })
    expect(new LibraryRepository(db).all()).toHaveLength(0)
  })
})
