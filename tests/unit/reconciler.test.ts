// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
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

function connectionCount(): number {
  return db.selectRows<{ n: number }>('SELECT count(*) AS n FROM connections;')[0]?.n ?? 0
}

describe('reconciler', () => {
  it('indexes markdown files, injects missing UUIDs, and classifies them', async () => {
    const fs = new MemoryFileStore({
      'spaces/glass/manuscript/01.md': '# Chapter One\nText.\n',
      'story-bible/characters/mara.md': '---\ntitle: Mara\n---\nA character.\n',
      'attachments/cover.png': 'binary', // ignored: not markdown
      'notes-outside.md': 'ignored: unknown top-level dir',
    })
    let counter = 0
    const result = await reconcile(fs, db, { now, generateId: () => `id-${++counter}` })

    expect(result.inserted).toBe(2)
    expect(docCount()).toBe(2)
    // UUID injected back into the file that had none
    expect(fs.peek('spaces/glass/manuscript/01.md')).toContain('id: id-1')

    const mara = db.selectRows<{ kind: string; workspace_id: string }>(
      "SELECT kind, workspace_id FROM documents WHERE rel_path = 'story-bible/characters/mara.md';",
    )[0]
    expect(mara?.kind).toBe('character')
    expect(mara?.workspace_id).toBe('ws-story-bible')
  })

  it('is stable — a second reconcile reports everything unchanged', async () => {
    const fs = new MemoryFileStore({ 'research/note.md': '---\nid: r1\n---\nHi.\n' })
    await reconcile(fs, db, { now })
    const result = await reconcile(fs, db, { now })
    expect(result).toEqual({ inserted: 0, updated: 0, deleted: 0, unchanged: 1 })
  })

  it('updates a document when its content changes', async () => {
    const fs = new MemoryFileStore({ 'research/note.md': '---\nid: r1\n---\nv1.\n' })
    await reconcile(fs, db, { now })
    await fs.writeTextFile('research/note.md', '---\nid: r1\n---\nv2 changed.\n')
    const result = await reconcile(fs, db, { now })
    expect(result.updated).toBe(1)
    expect(docCount()).toBe(1)
  })

  it('follows a rename by id instead of duplicating', async () => {
    const fs = new MemoryFileStore({ 'research/a.md': '---\nid: r1\n---\nBody.\n' })
    await reconcile(fs, db, { now })
    fs.moveSync('research/a.md', 'research/b.md')
    const result = await reconcile(fs, db, { now })
    expect(result).toMatchObject({ inserted: 0, updated: 1, deleted: 0 })
    expect(docCount()).toBe(1)
    const row = db.selectRows<{ rel_path: string }>(
      'SELECT rel_path FROM documents WHERE id = ?;',
      ['r1'],
    )[0]
    expect(row?.rel_path).toBe('research/b.md')
  })

  it('prunes a deleted document and its dangling connections', async () => {
    const fs = new MemoryFileStore({
      'research/a.md': '---\nid: r1\n---\nA.\n',
      'research/b.md': '---\nid: r2\n---\nB.\n',
    })
    await reconcile(fs, db, { now })
    db.run(
      `INSERT INTO connections (id, source_type, source_id, target_type, target_id, created_at)
       VALUES ('c1', 'document', 'r1', 'document', 'r2', ?);`,
      [now()],
    )
    await fs.deleteFile('research/a.md')
    const result = await reconcile(fs, db, { now })
    expect(result.deleted).toBe(1)
    expect(docCount()).toBe(1)
    expect(connectionCount()).toBe(0)
  })

  it('rebuild reconstructs from the folder and prunes vanished documents', async () => {
    const fs = new MemoryFileStore({
      'research/a.md': '---\nid: r1\n---\nA.\n',
      'research/b.md': '---\nid: r2\n---\nB.\n',
    })
    await reconcile(fs, db, { now })
    db.run(
      `INSERT INTO connections (id, source_type, source_id, target_type, target_id, created_at)
       VALUES ('c1', 'document', 'r2', 'document', 'r1', ?);`,
      [now()],
    )
    await fs.deleteFile('research/a.md') // r1's file vanishes
    const result = await reconcile(fs, db, { now, rebuild: true })
    expect(result.inserted).toBe(1) // only r2 re-inserted after wipe
    expect(result.deleted).toBe(1) // r1 pruned
    expect(docCount()).toBe(1)
    expect(connectionCount()).toBe(0) // c1 referenced r1 -> pruned
  })

  it('populates the FTS index for full-text search', async () => {
    const fs = new MemoryFileStore({
      'library/dune.md': '---\nid: b1\ntitle: Dune\ntags: [sf]\n---\nSpice worms in the desert.\n',
    })
    await reconcile(fs, db, { now })
    const hits = db.selectRows<{ title: string }>(
      `SELECT d.title AS title
         FROM documents_fts f JOIN documents d ON d.rowid = f.rowid
        WHERE documents_fts MATCH 'spice';`,
    )
    expect(hits[0]?.title).toBe('Dune')
  })
})
