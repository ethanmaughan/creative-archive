import { describe, expect, it } from 'vitest'
import { detectFormat, mergeNewAgents, parseImportedAgents } from './agent-import'
import type { Agent } from '../models/agent'

const SEED = JSON.stringify([
  { name: 'Alexandra Levick', agency: 'Writers House', location: 'New York, NY', genres: ['horror'] },
  { name: 'Anne Tibbets', agency: 'Donald Maass Literary Agency', genres: ['horror'] },
])

describe('detectFormat', () => {
  it('detects JSON vs CSV from the leading character', () => {
    expect(detectFormat('  [ {"name": "x"} ]')).toBe('json')
    expect(detectFormat('name,agency\nA,B')).toBe('csv')
  })
})

describe('parseImportedAgents', () => {
  it('parses the seed JSON as unresearched agents', () => {
    const agents = parseImportedAgents(SEED, 'json')
    expect(agents).toHaveLength(2)
    expect(agents[0]).toMatchObject({
      name: 'Alexandra Levick',
      agency: 'Writers House',
      genres: ['horror'],
      status: 'unresearched',
    })
  })

  it('preserves a valid status when the import already has one', () => {
    const agents = parseImportedAgents('[{"name":"X","agency":"Y","status":"open"}]', 'json')
    expect(agents[0]?.status).toBe('open')
  })

  it('drops rows without a name and throws on malformed JSON', () => {
    expect(parseImportedAgents('[{"agency":"NoName"}]', 'json')).toEqual([])
    expect(() => parseImportedAgents('{not json', 'json')).toThrow()
  })

  it('parses a CSV export back into agents', () => {
    const csv = 'name,agency,genres,status\nA,B,horror;literary,open\n'
    const agents = parseImportedAgents(csv, 'csv')
    expect(agents[0]).toMatchObject({ name: 'A', genres: ['horror', 'literary'], status: 'open' })
  })
})

describe('mergeNewAgents', () => {
  const existing: Agent[] = parseImportedAgents(SEED, 'json')

  it('skips duplicates by name+agency (case-insensitive) and stamps a source', () => {
    const incoming = parseImportedAgents(
      JSON.stringify([
        { name: 'alexandra levick', agency: 'writers house' }, // dup
        { name: 'Chris Lotts', agency: 'The Lotts Agency' }, // new
      ]),
      'json',
    )
    const { added, skipped } = mergeNewAgents(existing, incoming, '2026-08-03')
    expect(skipped).toBe(1)
    expect(added.map((a) => a.name)).toEqual(['Chris Lotts'])
    expect(added[0]?.source).toBe('Imported 2026-08-03')
  })

  it('dedupes within a single import batch too', () => {
    const incoming = parseImportedAgents(
      JSON.stringify([
        { name: 'New Person', agency: 'New Agency' },
        { name: 'New Person', agency: 'New Agency' },
      ]),
      'json',
    )
    const { added, skipped } = mergeNewAgents([], incoming, '2026-08-03')
    expect(added).toHaveLength(1)
    expect(skipped).toBe(1)
  })
})
