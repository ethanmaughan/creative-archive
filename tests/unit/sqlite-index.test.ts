// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'

let db: Sqlite

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

afterEach(() => {
  db.close()
})

const EXPECTED_TABLES = [
  'workspaces',
  'documents',
  'library_items',
  'extraction_facets',
  'connections',
  'tags',
  'taggings',
  'markets',
  'submissions',
  'submission_materials',
  'submission_events',
  'ai_runs',
  'documents_fts',
]

describe('sqlite-index migrations', () => {
  it('creates every expected table plus the FTS virtual table', () => {
    const names = db
      .selectRows<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;`,
      )
      .map((r) => r.name)
    for (const table of EXPECTED_TABLES) {
      expect(names).toContain(table)
    }
  })

  it('is idempotent — re-applying reports nothing new', () => {
    const result = applyMigrations(db, MIGRATIONS)
    expect(result.applied).toEqual([])
    expect(result.alreadyApplied).toEqual(['0000_init', '0001_fts_and_triggers'])
  })

  it('enforces foreign keys (document -> missing workspace is rejected)', () => {
    expect(() =>
      db.exec(
        `INSERT INTO documents (id, kind, rel_path, workspace_id, content_hash, file_mtime, indexed_at)
         VALUES ('d1', 'note', 'a.md', 'no-such-ws', 'h', 't', 't');`,
      ),
    ).toThrow()
  })

  it('blocks AI writes to a canonical workspace but allows a writable one (trigger)', () => {
    db.exec(
      `INSERT INTO workspaces (id, name, rel_path, protection, created_at)
       VALUES ('w-canon', 'Canon', 'projects', 'canonical', 't'),
              ('w-scratch', 'Scratch', 'workspaces/scratch', 'writable', 't');`,
    )
    expect(() =>
      db.exec(
        `INSERT INTO ai_runs (id, task, workspace_id, status, created_at)
         VALUES ('a1', 'summarize', 'w-canon', 'done', 't');`,
      ),
    ).toThrow(/writable/i)
    expect(() =>
      db.exec(
        `INSERT INTO ai_runs (id, task, workspace_id, status, created_at)
         VALUES ('a2', 'summarize', 'w-scratch', 'done', 't');`,
      ),
    ).not.toThrow()
  })

  it('rejects an invalid submission status (CHECK constraint)', () => {
    db.exec(`INSERT INTO markets (id, kind, name) VALUES ('m1', 'agent', 'Agent X');`)
    expect(() =>
      db.exec(
        `INSERT INTO submissions (id, market_id, title, status, created_at, updated_at)
         VALUES ('s1', 'm1', 'Novel', 'bogus-status', 't', 't');`,
      ),
    ).toThrow()
  })

  it('supports FTS5 full-text matching', () => {
    db.exec(
      `INSERT INTO documents_fts (rowid, title, body, tags) VALUES (1, 'Dune', 'spice worms desert', 'sf');`,
    )
    const rowids = db
      .selectRows<{ rowid: number }>(
        `SELECT rowid FROM documents_fts WHERE documents_fts MATCH 'spice';`,
      )
      .map((r) => r.rowid)
    expect(rowids).toContain(1)
  })
})
