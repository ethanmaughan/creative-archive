// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile, reindexOne } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { LinkRepository } from '@/data/repositories/link-repository'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

function linkCount(): number {
  return db.selectRows<{ n: number }>('SELECT count(*) AS n FROM links;')[0]?.n ?? 0
}

describe('wikilink graph', () => {
  it('resolves [[Title]] to a document and exposes it as a backlink', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md': '---\nid: a\ntitle: Note A\n---\nSee [[Note B]] for more.\n',
      'notebook/b.md': '---\nid: b\ntitle: Note B\n---\nThe target.\n',
    })
    await reconcile(fs, db, { now })

    const backlinks = new LinkRepository(db).referencesTo('b')
    expect(backlinks).toHaveLength(1)
    expect(backlinks[0]?.sourceId).toBe('a')
    expect(backlinks[0]?.title).toBe('Note A')
  })

  it('matches by filename too, and records unresolved links as broken', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md': '---\nid: a\ntitle: Note A\n---\n[[b]] exists, [[ghost]] does not.\n',
      'notebook/b.md': '---\nid: b\ntitle: Note B\n---\n.\n',
    })
    await reconcile(fs, db, { now })
    expect(linkCount()).toBe(2)
    // one resolved (to b), one broken (null target)
    expect(new LinkRepository(db).referencesTo('b')).toHaveLength(1)
    const broken = db.selectRows<{ n: number }>(
      'SELECT count(*) AS n FROM links WHERE target_id IS NULL;',
    )[0]?.n
    expect(broken).toBe(1)
  })

  it('resolves a previously-broken inbound link when the target is later created', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md': '---\nid: a\ntitle: Note A\n---\nlink to [[Future]].\n',
    })
    await reconcile(fs, db, { now })
    expect(new LinkRepository(db).referencesTo('f')).toHaveLength(0) // nothing resolves yet

    // Create the target and reindex just that file.
    await fs.writeTextFile('notebook/future.md', '---\nid: f\ntitle: Future\n---\n.\n')
    await reindexOne(fs, db, 'notebook/future.md', { now })

    const backlinks = new LinkRepository(db).referencesTo('f')
    expect(backlinks).toHaveLength(1)
    expect(backlinks[0]?.sourceId).toBe('a')
  })

  it('breaks inbound links when the target document is deleted', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md': '---\nid: a\ntitle: Note A\n---\n[[Note B]]\n',
      'notebook/b.md': '---\nid: b\ntitle: Note B\n---\n.\n',
    })
    await reconcile(fs, db, { now })
    expect(new LinkRepository(db).referencesTo('b')).toHaveLength(1)

    await fs.deleteFile('notebook/b.md')
    await reindexOne(fs, db, 'notebook/b.md', { now })

    expect(new LinkRepository(db).referencesTo('b')).toHaveLength(0)
    // The source's link row survives but is now unresolved.
    expect(
      db.selectRows<{ n: number }>('SELECT count(*) AS n FROM links WHERE source_id = ?;', ['a'])[0]
        ?.n,
    ).toBe(1)
  })

  it('exposes references to a bare, un-filed topic by written text (case-insensitive)', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md': '---\nid: a\ntitle: Note A\n---\nA nod to [[Determinism]].\n',
      'notebook/c.md': '---\nid: c\ntitle: Note C\n---\nAnother [[determinism]] beat.\n',
    })
    await reconcile(fs, db, { now })
    // No note titled "Determinism" exists, so it never resolves by id...
    expect(new LinkRepository(db).referencesTo('determinism')).toHaveLength(0)
    // ...but both notes surface as references to the bare topic text.
    const refs = new LinkRepository(db).referencesToText(['determinism'])
    expect(refs.map((r) => r.sourceId).sort()).toEqual(['a', 'c'])
    expect(typeof refs[0]?.kind).toBe('string')
  })

  it('rebuilds the whole graph on a full reconcile (delete-index-and-rebuild)', async () => {
    const fs = new MemoryFileStore({
      'notebook/a.md': '---\nid: a\ntitle: Note A\n---\n[[Note B]]\n',
      'notebook/b.md': '---\nid: b\ntitle: Note B\n---\n.\n',
    })
    await reconcile(fs, db, { now })
    await reconcile(fs, db, { now, rebuild: true })
    expect(linkCount()).toBe(1)
    expect(new LinkRepository(db).referencesTo('b')).toHaveLength(1)
  })
})
