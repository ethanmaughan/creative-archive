// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { reconcileSources, reindexOneSource } from '@/data/ingest/reconcile-sources'
import { SourceRepository } from '@/data/repositories/source-repository'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

function sourceCount(): number {
  return db.selectRows<{ n: number }>('SELECT count(*) AS n FROM source_files;')[0]?.n ?? 0
}

describe('reconcileSources', () => {
  it('indexes foreign files but never authored documents, and never rewrites them', async () => {
    const fs = new MemoryFileStore({
      'research/idea.md': '---\ntitle: Idea\n---\nAuthored note.\n', // authored → NOT a source
      'uploads/outline.txt': 'The dragon guards the northern pass.\n',
      'loose.md': 'A loose markdown file dropped in the root.\n', // loose md → source
      '.DS_Store': 'junk', // hidden → ignored
    })

    const result = await reconcileSources(fs, db, { now })

    expect(result.inserted).toBe(2) // outline.txt + loose.md
    expect(sourceCount()).toBe(2)
    // The authored doc is absent from source_files (it belongs to the documents index).
    const paths = db
      .selectRows<{ rel_path: string }>('SELECT rel_path FROM source_files ORDER BY rel_path;')
      .map((r) => r.rel_path)
    expect(paths).toEqual(['loose.md', 'uploads/outline.txt'])
    // Read-only: the source file's bytes are untouched (no frontmatter injected).
    expect(fs.peek('uploads/outline.txt')).toBe('The dragon guards the northern pass.\n')
  })

  it('makes source text findable via FTS', async () => {
    const fs = new MemoryFileStore({
      'uploads/outline.txt': 'The dragon guards the northern pass.\n',
    })
    await reconcileSources(fs, db, { now })
    const sources = new SourceRepository(db)
    const hits = sources.search('dragon')
    expect(hits).toHaveLength(1)
    expect(hits[0]?.relPath).toBe('uploads/outline.txt')
    expect(hits[0]?.hasText).toBe(true)
  })

  it('prunes sources whose files disappear', async () => {
    const fs = new MemoryFileStore({ 'uploads/a.txt': 'alpha', 'uploads/b.txt': 'beta' })
    await reconcileSources(fs, db, { now })
    expect(sourceCount()).toBe(2)

    await fs.deleteFile('uploads/b.txt')
    const result = await reconcileSources(fs, db, { now })
    expect(result.deleted).toBe(1)
    expect(sourceCount()).toBe(1)
  })

  it('coexists with the document reconciler over the same folder', async () => {
    const fs = new MemoryFileStore({
      'research/idea.md': '# Idea\n', // authored document
      'uploads/notes.txt': 'reference material', // source
    })
    let counter = 0
    await reconcile(fs, db, { now, generateId: () => `id-${++counter}` })
    await reconcileSources(fs, db, { now })

    expect(db.selectRows<{ n: number }>('SELECT count(*) AS n FROM documents;')[0]?.n).toBe(1)
    expect(sourceCount()).toBe(1)
  })

  it('reindexOneSource removes a deleted source', async () => {
    const fs = new MemoryFileStore({ 'uploads/a.txt': 'alpha' })
    await reconcileSources(fs, db, { now })
    expect(sourceCount()).toBe(1)

    await fs.deleteFile('uploads/a.txt')
    const outcome = await reindexOneSource(fs, db, 'uploads/a.txt', { now })
    expect(outcome).toBe('removed')
    expect(sourceCount()).toBe(0)
  })

  it('reindexOneSource skips authored document paths', async () => {
    const fs = new MemoryFileStore({ 'research/idea.md': '# Idea\n' })
    const outcome = await reindexOneSource(fs, db, 'research/idea.md', { now })
    expect(outcome).toBe('skipped')
  })
})
