import type { SubmissionStatus } from '@/domain/models/submission'

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  queued: 'Queued',
  submitted: 'Submitted',
  received: 'Received',
  rejected: 'Rejected',
  accepted: 'Accepted',
  withdrawn: 'Withdrawn',
  no_response: 'No response',
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as SubmissionStatus] ?? status
}

export type StatusTone = 'good' | 'bad' | 'muted' | 'default'

export function statusTone(status: string): StatusTone {
  if (status === 'accepted') return 'good'
  if (status === 'rejected') return 'bad'
  if (status === 'withdrawn' || status === 'no_response') return 'muted'
  return 'default'
}

export const MARKET_KIND_LABELS: Record<string, string> = {
  agent: 'Agent',
  publisher: 'Publisher',
  magazine: 'Magazine',
  contest: 'Contest',
}

export function marketKindLabel(kind: string): string {
  return MARKET_KIND_LABELS[kind] ?? kind
}
