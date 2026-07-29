import type { MediaType } from '@/domain/models/document'

export const MEDIA_LABELS: Record<MediaType, string> = {
  book: 'Book',
  movie: 'Film',
  tv: 'Television',
  game: 'Game',
  article: 'Article',
  paper: 'Paper',
  music: 'Music',
  experience: 'Experience',
  dream: 'Dream',
  observation: 'Observation',
}

export function mediaLabel(mediaType: string): string {
  return MEDIA_LABELS[mediaType as MediaType] ?? mediaType
}

export function ratingStars(rating: number | null): string {
  if (!rating) return ''
  const clamped = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped)
}

/** Format a YYYY-MM-DD date without timezone drift (parse as local, not UTC midnight). */
export function formatConsumed(ymd: string | null): string {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Format the logged ISO datetime as a short local date + time. */
export function formatLogged(iso: string | null): string {
  if (!iso) return ''
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
