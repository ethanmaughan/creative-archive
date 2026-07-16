// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { ExtractionRepository } from '@/data/repositories/extraction-repository'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

describe('extraction projection', () => {
  it('extracts facets from a library item body', async () => {
    const fs = new MemoryFileStore({
      'library/book/dune.md':
        '---\nid: b1\ntitle: Dune\nmediaType: book\n---\n## Techniques\nUnreliable narrator.\n## Themes\nPower.\n',
    })
    await reconcile(fs, db, { now })
    const repo = new ExtractionRepository(db)
    expect(repo.all()).toHaveLength(2)
    expect(repo.all('technique')).toHaveLength(1)
    expect(repo.all('technique')[0]?.content).toBe('Unreliable narrator.')
  })

  it('re-parses facets after an edit and prunes removed ones', async () => {
    const fs = new MemoryFileStore({
      'library/book/dune.md':
        '---\nid: b1\ntitle: Dune\nmediaType: book\n---\n## Techniques\nA.\n## Themes\nB.\n',
    })
    await reconcile(fs, db, { now })
    expect(new ExtractionRepository(db).all()).toHaveLength(2)

    await fs.writeTextFile(
      'library/book/dune.md',
      '---\nid: b1\ntitle: Dune\nmediaType: book\n---\n## Techniques\nA revised.\n',
    )
    await reconcile(fs, db, { now })
    const repo = new ExtractionRepository(db)
    expect(repo.all()).toHaveLength(1)
    expect(repo.all('technique')[0]?.content).toBe('A revised.')
  })

  it('does not extract facets from non-library documents', async () => {
    const fs = new MemoryFileStore({
      'notebook/n.md': '---\nid: n1\n---\n## Techniques\nShould be ignored.\n',
    })
    await reconcile(fs, db, { now })
    expect(new ExtractionRepository(db).all()).toHaveLength(0)
  })
})
