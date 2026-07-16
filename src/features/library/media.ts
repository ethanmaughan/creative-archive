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
