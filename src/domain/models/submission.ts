export const SUBMISSION_STATUSES = [
  'draft',
  'queued',
  'submitted',
  'received',
  'rejected',
  'accepted',
  'withdrawn',
  'no_response',
] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]
