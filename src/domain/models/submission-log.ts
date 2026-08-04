/**
 * The per-manuscript submission log — an append-only CSV of status-change events, one row each:
 * `agent_name,status,timestamp,note`. The *current* stage for an agent is simply their most
 * recent row (default `not_queried` if they have none). Pure, no IO.
 *
 * This is the writer's own record of where each query stands. "Marking" a status is a manual log
 * of something the writer did themselves — the app never submits or contacts anyone.
 */
import { QUERY_TRACKER_DIR } from './agent'

export const SUBMISSION_STAGES = [
  'not_queried',
  'queried',
  'responded_request',
  'responded_pass',
  'offer',
  'withdrawn',
] as const
export type SubmissionStage = (typeof SUBMISSION_STAGES)[number]

export const STAGE_LABEL: Record<SubmissionStage, string> = {
  not_queried: 'Not queried',
  queried: 'Queried',
  responded_request: 'Requested pages',
  responded_pass: 'Passed',
  offer: 'Offer',
  withdrawn: 'Withdrawn',
}

export const DEFAULT_STAGE: SubmissionStage = 'not_queried'

export interface SubmissionEvent {
  readonly agentName: string
  readonly status: SubmissionStage
  /** ISO datetime the status change was logged. */
  readonly timestamp: string
  readonly note: string
}

export const SUBMISSION_COLUMNS = ['agent_name', 'status', 'timestamp', 'note'] as const
export const SUBMISSIONS_CSV_SUFFIX = '.submissions.csv'

export function submissionsCsvPath(slug: string): string {
  return `${QUERY_TRACKER_DIR}/${slug}${SUBMISSIONS_CSV_SUFFIX}`
}

export function asStage(value: string): SubmissionStage {
  return (SUBMISSION_STAGES as readonly string[]).includes(value)
    ? (value as SubmissionStage)
    : DEFAULT_STAGE
}

export function recordToEvent(record: Record<string, string>): SubmissionEvent {
  return {
    agentName: (record['agent_name'] ?? '').trim(),
    status: asStage((record['status'] ?? '').trim()),
    timestamp: (record['timestamp'] ?? '').trim(),
    note: record['note'] ?? '',
  }
}

export function eventToRecord(event: SubmissionEvent): Record<string, string> {
  return {
    agent_name: event.agentName,
    status: event.status,
    timestamp: event.timestamp,
    note: event.note,
  }
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

/** The most-recent event per agent (by timestamp, later file rows breaking ties). */
export function latestByAgent(events: readonly SubmissionEvent[]): Map<string, SubmissionEvent> {
  const latest = new Map<string, SubmissionEvent>()
  for (const event of events) {
    const key = nameKey(event.agentName)
    const prev = latest.get(key)
    if (!prev || event.timestamp >= prev.timestamp) latest.set(key, event)
  }
  return latest
}

export function currentStage(
  events: readonly SubmissionEvent[],
  agentName: string,
): SubmissionStage {
  return latestByAgent(events).get(nameKey(agentName))?.status ?? DEFAULT_STAGE
}

/** An agent's full status history, newest first. */
export function historyFor(
  events: readonly SubmissionEvent[],
  agentName: string,
): SubmissionEvent[] {
  const key = nameKey(agentName)
  return events
    .filter((event) => nameKey(event.agentName) === key)
    .slice()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
}
