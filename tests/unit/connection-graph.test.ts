// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { MemoryFileStore } from '@/data/storage/file-store/fake/memory-file-store'
import { ConnectionRepository } from '@/data/repositories/connection-repository'

let db: Sqlite
const now = (): string => '2026-01-01T00:00:00Z'

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

function seedDocs(): Promise<unknown> {
  const fs = new MemoryFileStore({
    'story-bible/characters/mara.md': '---\nid: mara\ntitle: Mara\n---\nx\n',
    'projects/glass/manuscript/01.md': '---\nid: ch1\ntitle: Chapter One\n---\ny\n',
  })
  return reconcile(fs, db, { now })
}

describe('connection graph', () => {
  it('inserts and reads edges with both ends resolved', async () => {
    await seedDocs()
    const repo = new ConnectionRepository(db)
    repo.insert({
      id: 'c1',
      sourceId: 'mara',
      targetId: 'ch1',
      relationship: 'appears-in',
      createdAt: now(),
    })
    const all = repo.all()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({
      relationship: 'appears-in',
      sourceTitle: 'Mara',
      targetTitle: 'Chapter One',
    })
    expect(repo.forDocument('ch1')).toHaveLength(1)
    expect(repo.forDocument('mara')).toHaveLength(1)
  })

  it('dedupes identical edges via the unique key', async () => {
    await seedDocs()
    const repo = new ConnectionRepository(db)
    repo.insert({
      id: 'c1',
      sourceId: 'mara',
      targetId: 'ch1',
      relationship: 'appears-in',
      createdAt: now(),
    })
    repo.insert({
      id: 'c2',
      sourceId: 'mara',
      targetId: 'ch1',
      relationship: 'appears-in',
      createdAt: now(),
    })
    expect(repo.all()).toHaveLength(1)
  })

  it('removes an edge', async () => {
    await seedDocs()
    const repo = new ConnectionRepository(db)
    repo.insert({
      id: 'c1',
      sourceId: 'mara',
      targetId: 'ch1',
      relationship: 'related-to',
      createdAt: now(),
    })
    repo.remove('c1')
    expect(repo.all()).toHaveLength(0)
  })

  it('prunes edges when a connected document is deleted', async () => {
    await seedDocs()
    new ConnectionRepository(db).insert({
      id: 'c1',
      sourceId: 'mara',
      targetId: 'ch1',
      relationship: 'appears-in',
      createdAt: now(),
    })
    const fs = new MemoryFileStore({
      'projects/glass/manuscript/01.md': '---\nid: ch1\ntitle: Chapter One\n---\ny\n',
    })
    await reconcile(fs, db, { now })
    expect(new ConnectionRepository(db).all()).toHaveLength(0)
  })
})
