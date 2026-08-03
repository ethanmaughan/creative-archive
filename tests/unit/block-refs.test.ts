// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { LinkRepository } from '@/data/repositories/link-repository'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

describe('block references', () => {
  it('indexes ^id block markers and headings into the blocks table', async () => {
    const fs = new MemoryFileStore({
      'notebook/b.md': '---\nid: b\ntitle: Note B\n---\n# Backstory\n\nA guarded pass. ^k9\n',
    })
    await reconcile(fs, db, { now })
    const rows = db.selectRows<{ anchor: string; type: string }>(
      "SELECT anchor, type FROM blocks WHERE document_id = 'b' ORDER BY position;",
    )
    expect(rows).toEqual([
      { anchor: 'backstory', type: 'heading' },
      { anchor: 'k9', type: 'block' },
    ])
  })

  it('resolves [[Doc#^id]] to the target doc and records the block anchor', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md':
        '---\nid: a\ntitle: Note A\n---\nSee [[Note B#^k9]] and [[Note B#Backstory]].\n',
      'notebook/b.md': '---\nid: b\ntitle: Note B\n---\n# Backstory\n\nA guarded pass. ^k9\n',
    })
    await reconcile(fs, db, { now })

    // Backlinks still resolve at document granularity.
    expect(new LinkRepository(db).referencesTo('b').map((x) => x.sourceId)).toEqual(['a'])
    // The block anchor is recorded on the link.
    const targetBlocks = db
      .selectRows<{ target_block: string | null }>(
        "SELECT target_block FROM links WHERE source_id = 'a' ORDER BY target_block;",
      )
      .map((r) => r.target_block)
    expect(targetBlocks).toEqual(['Backstory', '^k9'])
  })

  it('handles a same-doc [[#^id]] as a self-reference', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md':
        '---\nid: a\ntitle: Note A\n---\nJump to [[#^here]].\n\nTarget line. ^here\n',
    })
    await reconcile(fs, db, { now })
    const row = db.selectRows<{ target_id: string | null; target_block: string | null }>(
      "SELECT target_id, target_block FROM links WHERE source_id = 'a';",
    )[0]
    expect(row).toEqual({ target_id: 'a', target_block: '^here' })
  })
})
