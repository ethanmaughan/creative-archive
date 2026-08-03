import { describe, expect, it } from 'vitest'
import {
  agentKey,
  agentToRecord,
  agentsCsvPath,
  isStale,
  manuscriptSlugFromPath,
  recordToAgent,
  type Agent,
} from './agent'

const base: Agent = {
  name: 'Catherine Ross',
  agency: 'Corvisiero Literary Agency',
  location: 'New York, NY',
  genres: ['horror', 'horror-comedy'],
  notableClients: [],
  wishlistNotes: 'Wants voice-driven, darkly funny horror.',
  guidelinesUrl: 'https://example.com/guidelines',
  guidelinesNotes: 'First 10 pages pasted in the body.',
  status: 'open',
  statusLastChecked: '2026-08-01',
  source: 'Directory of Literary Agents 2026-2027',
  personalFitNotes: 'Loved a client book.',
  tags: ['top choice', 'boutique'],
}

describe('agent record mapping', () => {
  it('round-trips an agent through a CSV record', () => {
    expect(recordToAgent(agentToRecord(base))).toEqual(base)
  })

  it('splits/joins multi-value columns on semicolons', () => {
    const rec = agentToRecord(base)
    expect(rec['genres']).toBe('horror;horror-comedy')
    expect(rec['tags']).toBe('top choice;boutique')
  })

  it('defaults an unknown status to unresearched and trims fields', () => {
    const agent = recordToAgent({ name: '  Zoë Plant ', agency: 'The Bent Agency', status: 'weird' })
    expect(agent.name).toBe('Zoë Plant')
    expect(agent.status).toBe('unresearched')
    expect(agent.genres).toEqual([])
  })
})

describe('paths + identity', () => {
  it('builds and parses the manuscript CSV path', () => {
    expect(agentsCsvPath('somethings-happening')).toBe(
      'query-tracker/somethings-happening.agents.csv',
    )
    expect(manuscriptSlugFromPath('query-tracker/book-two.agents.csv')).toBe('book-two')
    expect(manuscriptSlugFromPath('query-tracker/book.submissions.csv')).toBeNull()
    expect(manuscriptSlugFromPath('notebook/x.md')).toBeNull()
  })

  it('dedupes on name+agency, case-insensitively', () => {
    expect(agentKey({ name: 'Kim Lionetti', agency: 'BookEnds Literary Agency' })).toBe(
      agentKey({ name: 'kim lionetti', agency: 'bookends literary agency' }),
    )
  })
})

describe('isStale', () => {
  const now = new Date('2026-08-03T00:00:00Z')

  it('flags a check older than the threshold', () => {
    expect(isStale({ ...base, statusLastChecked: '2026-01-01' }, 3, now)).toBe(true)
  })

  it('leaves a recent check alone', () => {
    expect(isStale({ ...base, statusLastChecked: '2026-07-15' }, 3, now)).toBe(false)
  })

  it('does not flag never-checked or invalid dates (those are unresearched, not stale)', () => {
    expect(isStale({ ...base, statusLastChecked: '' }, 3, now)).toBe(false)
    expect(isStale({ ...base, statusLastChecked: 'nonsense' }, 3, now)).toBe(false)
  })
})
