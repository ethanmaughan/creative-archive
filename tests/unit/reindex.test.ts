// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile, reindexOne } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

function docCount(): number {
  return db.selectRows<{ n: number }>('SELECT count(*) AS n FROM documents;')[0]?.n ?? 0
}

describe('reindexOne', () => {
  it('indexes a single new file', async () => {
    const fs = new MemoryFileStore({ 'research/a.md': '---\nid: r1\n---\nHi.\n' })
    expect(await reindexOne(fs, db, 'research/a.md', { now })).toBe('inserted')
    expect(docCount()).toBe(1)
  })

  it('updates an existing document after an edit', async () => {
    const fs = new MemoryFileStore({ 'research/a.md': '---\nid: r1\n---\nv1.\n' })
    await reconcile(fs, db, { now })
    await fs.writeTextFile('research/a.md', '---\nid: r1\n---\nv2 changed.\n')
    expect(await reindexOne(fs, db, 'research/a.md', { now })).toBe('updated')
    expect(docCount()).toBe(1)
  })

  it('removes a document whose file is gone', async () => {
    const fs = new MemoryFileStore({ 'research/a.md': '---\nid: r1\n---\nHi.\n' })
    await reconcile(fs, db, { now })
    await fs.deleteFile('research/a.md')
    expect(await reindexOne(fs, db, 'research/a.md', { now })).toBe('removed')
    expect(docCount()).toBe(0)
  })

  it('classifies a notebook note', async () => {
    const fs = new MemoryFileStore({ 'notebook/idea.md': '---\nid: n1\ntitle: Idea\n---\nText.\n' })
    await reindexOne(fs, db, 'notebook/idea.md', { now })
    const row = db.selectRows<{ kind: string; workspace_id: string }>(
      "SELECT kind, workspace_id FROM documents WHERE id = 'n1';",
    )[0]
    expect(row?.kind).toBe('note')
    expect(row?.workspace_id).toBe('ws-notebook')
  })

  it('skips non-indexable paths', async () => {
    const fs = new MemoryFileStore({ 'attachments/x.png': 'binary' })
    expect(await reindexOne(fs, db, 'attachments/x.png', { now })).toBe('skipped')
  })
})
