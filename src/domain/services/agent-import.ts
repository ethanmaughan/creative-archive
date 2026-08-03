/**
 * Import literary agents into a manuscript's list from pasted/uploaded data. Pure, no IO.
 *
 * Accepts a JSON array (the shape research directories/tools export) or a CSV export. Imported
 * rows come in as `unresearched` unless they already carry a valid status, and are de-duplicated
 * against the existing list by name+agency. Nothing here fetches from the web — the caller hands
 * in text the writer pasted or picked from a file.
 */
import { parseCsvRecords } from '@/shared/csv'
import { agentKey, asAgentStatus, recordToAgent, type Agent } from '../models/agent'

export type ImportFormat = 'json' | 'csv'

/** Guess the format from the content: a leading `[` or `{` means JSON, otherwise CSV. */
export function detectFormat(text: string): ImportFormat {
  const head = text.trimStart()
  return head.startsWith('[') || head.startsWith('{') ? 'json' : 'csv'
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').map((s) => s.trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function jsonToAgent(raw: unknown): Agent {
  const o = (raw ?? {}) as Record<string, unknown>
  const status = o['status']
  return {
    name: str(o['name']),
    agency: str(o['agency']),
    location: str(o['location']),
    genres: toList(o['genres']),
    notableClients: toList(o['notable_clients'] ?? o['notableClients']),
    wishlistNotes: str(o['wishlist_notes'] ?? o['wishlistNotes']),
    guidelinesUrl: str(o['guidelines_url'] ?? o['guidelinesUrl']),
    guidelinesNotes: str(o['guidelines_notes'] ?? o['guidelinesNotes']),
    status: status === undefined ? 'unresearched' : asAgentStatus(str(status)),
    statusLastChecked: str(o['status_last_checked'] ?? o['statusLastChecked']),
    source: str(o['source']),
    personalFitNotes: str(o['personal_fit_notes'] ?? o['personalFitNotes']),
    tags: toList(o['tags']),
  }
}

/** Parse import text into agents. Throws on malformed JSON. Rows without a name are dropped. */
export function parseImportedAgents(text: string, format: ImportFormat): Agent[] {
  if (format === 'csv') {
    return parseCsvRecords(text)
      .map(recordToAgent)
      .filter((agent) => agent.name !== '')
  }
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data) ? data : [data]
  return list.map(jsonToAgent).filter((agent) => agent.name !== '')
}

export interface MergeResult {
  readonly added: Agent[]
  readonly skipped: number
}

/** Append only genuinely-new agents (by name+agency), stamping an import source when absent. */
export function mergeNewAgents(
  existing: readonly Agent[],
  incoming: readonly Agent[],
  importedOn: string,
): MergeResult {
  const seen = new Set(existing.map(agentKey))
  const added: Agent[] = []
  for (const agent of incoming) {
    const key = agentKey(agent)
    if (seen.has(key)) continue
    seen.add(key)
    added.push(agent.source === '' ? { ...agent, source: `Imported ${importedOn}` } : agent)
  }
  return { added, skipped: incoming.length - added.length }
}
