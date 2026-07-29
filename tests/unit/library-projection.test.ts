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

  it('projects consumedOn and logged from frontmatter', async () => {
    const fs = new MemoryFileStore({
      'library/movie/arrival.md':
        '---\nid: m1\ntitle: Arrival\nmediaType: movie\nconsumedOn: 2026-05-02\nlogged: 2026-05-03T14:00:00Z\n---\n.\n',
    })
    await reconcile(fs, db, { now })
    const item = new LibraryRepository(db).all()[0]
    expect(item?.consumedOn).toBe('2026-05-02')
    expect(item?.logged).toBe('2026-05-03T14:00:00Z')
  })

  it('sorts chronologically by the chosen date, with missing dates last', async () => {
    const fs = new MemoryFileStore({
      'library/book/a.md':
        '---\nid: a\ntitle: A\nmediaType: book\nconsumedOn: 2026-01-10\n---\n.\n',
      'library/book/b.md':
        '---\nid: b\ntitle: B\nmediaType: book\nconsumedOn: 2026-03-20\n---\n.\n',
      'library/book/c.md': '---\nid: c\ntitle: C\nmediaType: book\n---\n.\n', // no consumed date
    })
    await reconcile(fs, db, { now })
    const repo = new LibraryRepository(db)

    const newest = repo.all({ by: 'consumed', dir: 'desc' }).map((i) => i.title)
    expect(newest).toEqual(['B', 'A', 'C']) // C (no date) always last

    const oldest = repo.all({ by: 'consumed', dir: 'asc' }).map((i) => i.title)
    expect(oldest).toEqual(['A', 'B', 'C']) // C still last, not first
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
