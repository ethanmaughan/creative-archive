// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { openInMemory } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { QueryTrackerRepository } from '@/data/repositories/query-tracker-repository'

let db: Sqlite

beforeEach(async () => {
  db = await openInMemory()
  applyMigrations(db, MIGRATIONS)
})

describe('QueryTrackerRepository', () => {
  it('creates markets and submissions with the market joined in', () => {
    const repo = new QueryTrackerRepository(db)
    repo.insertMarket({ id: 'm1', kind: 'agent', name: 'Agent X' })
    repo.insertSubmission({
      id: 's1',
      title: 'My Novel',
      marketId: 'm1',
      documentId: null,
      manuscriptRev: 'draft 2',
      status: 'draft',
      createdAt: 't',
      updatedAt: 't',
    })
    expect(repo.markets()).toHaveLength(1)
    const subs = repo.submissions()
    expect(subs).toHaveLength(1)
    expect(subs[0]).toMatchObject({
      title: 'My Novel',
      marketName: 'Agent X',
      marketKind: 'agent',
      status: 'draft',
      manuscriptRev: 'draft 2',
    })
  })

  it('updates status and logs an event', () => {
    const repo = new QueryTrackerRepository(db)
    repo.insertMarket({ id: 'm1', kind: 'magazine', name: 'The Journal' })
    repo.insertSubmission({
      id: 's1',
      title: 'A Story',
      marketId: 'm1',
      documentId: null,
      manuscriptRev: null,
      status: 'draft',
      createdAt: 't',
      updatedAt: 't',
    })
    expect(repo.statusOf('s1')).toBe('draft')
    repo.updateStatus('s1', 'submitted', 't2')
    repo.addEvent({
      id: 'e1',
      submissionId: 's1',
      kind: 'status_change',
      status: 'submitted',
      body: null,
      occurredOn: 't2',
    })
    expect(repo.statusOf('s1')).toBe('submitted')
    const events = repo.eventsFor('s1')
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'status_change', status: 'submitted' })
  })
})
