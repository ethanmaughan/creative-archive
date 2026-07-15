/** The submission status state machine (Query Tracker). Pure, no IO. */
import type { SubmissionStatus } from '../models/submission'

const TRANSITIONS: Record<SubmissionStatus, readonly SubmissionStatus[]> = {
  draft: ['queued', 'submitted', 'withdrawn'],
  queued: ['submitted', 'withdrawn', 'draft'],
  submitted: ['received', 'rejected', 'accepted', 'withdrawn', 'no_response'],
  received: ['rejected', 'accepted', 'withdrawn'],
  rejected: [],
  accepted: [],
  withdrawn: [],
  no_response: ['withdrawn'],
}

export function allowedNextStatuses(from: SubmissionStatus): readonly SubmissionStatus[] {
  return TRANSITIONS[from]
}

export function canTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function isTerminalStatus(status: SubmissionStatus): boolean {
  return TRANSITIONS[status].length === 0
}
