// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { GraphRepository } from '@/data/repositories/graph-repository'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

describe('GraphRepository', () => {
  it('unions wikilink + connection edges, deduped and undirected, skipping broken links', async () => {
    const fs = new MemoryFileStore({
      // A ↔ B via reciprocal wikilinks (should collapse to one undirected edge)
      'notebook/a.md': '---\nid: a\ntitle: A\n---\n[[B]] and [[Ghost]]\n', // Ghost is unresolved
      'notebook/b.md': '---\nid: b\ntitle: B\n---\n[[A]]\n',
      'notebook/c.md': '---\nid: c\ntitle: C\n---\nplain\n',
    })
    await reconcile(fs, db, { now })
    // A manual connection B—C (not from files).
    db.run(
      "INSERT INTO connections (id, source_type, source_id, target_type, target_id, created_at) VALUES ('x','document','b','document','c','t');",
    )

    const g = new GraphRepository(db).graph()
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c'])
    // edges: {a,b} from the reciprocal wikilinks (deduped to one) + {b,c} from the connection.
    // The broken [[Ghost]] contributes no edge.
    const pairs = g.edges.map((e) => [e.source, e.target].sort().join('-')).sort()
    expect(pairs).toEqual(['a-b', 'b-c'])
  })

  it('returns nodes with no edges when nothing is linked', async () => {
    const fs = new MemoryFileStore({ 'notebook/a.md': '---\nid: a\ntitle: A\n---\nx\n' })
    await reconcile(fs, db, { now })
    const g = new GraphRepository(db).graph()
    expect(g.nodes).toHaveLength(1)
    expect(g.edges).toHaveLength(0)
  })
})
