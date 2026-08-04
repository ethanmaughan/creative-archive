import { describe, expect, it } from 'vitest'
import {
  currentStage,
  eventToRecord,
  historyFor,
  recordToEvent,
  submissionsCsvPath,
  type SubmissionEvent,
} from './submission-log'

const events: SubmissionEvent[] = [
  { agentName: 'Chris Lotts', status: 'not_queried', timestamp: '2026-08-01T10:00:00Z', note: '' },
  { agentName: 'Chris Lotts', status: 'queried', timestamp: '2026-08-02T10:00:00Z', note: 'sent' },
  { agentName: 'Ginger Clark', status: 'queried', timestamp: '2026-08-02T11:00:00Z', note: '' },
  {
    agentName: 'Chris Lotts',
    status: 'responded_request',
    timestamp: '2026-08-05T09:00:00Z',
    note: 'wants 50pp',
  },
]

describe('submission log', () => {
  it('round-trips an event through a CSV record', () => {
    expect(recordToEvent(eventToRecord(events[1]!))).toEqual(events[1])
  })

  it('defaults an unknown status to not_queried', () => {
    expect(
      recordToEvent({ agent_name: 'X', status: 'bogus', timestamp: 't', note: '' }).status,
    ).toBe('not_queried')
  })

  it('current stage is the most recent event, default not_queried', () => {
    expect(currentStage(events, 'Chris Lotts')).toBe('responded_request')
    expect(currentStage(events, 'ginger clark')).toBe('queried')
    expect(currentStage(events, 'Nobody Yet')).toBe('not_queried')
  })

  it('history is newest-first and scoped to the agent', () => {
    const history = historyFor(events, 'Chris Lotts')
    expect(history.map((e) => e.status)).toEqual(['responded_request', 'queried', 'not_queried'])
  })

  it('builds the submissions CSV path', () => {
    expect(submissionsCsvPath('book-one')).toBe('query-tracker/book-one.submissions.csv')
  })
})
