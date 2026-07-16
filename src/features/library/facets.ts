import type { FacetKind } from '@/domain/models/extraction'

export const FACET_LABELS: Record<FacetKind, string> = {
  review: 'Review',
  technique: 'Techniques',
  theme: 'Themes',
  atmosphere: 'Atmosphere',
  imagery: 'Imagery',
  dialogue: 'Dialogue',
  structure: 'Structure',
  worldbuilding: 'Worldbuilding',
  note: 'Notes',
}

export function facetLabel(facet: string): string {
  return FACET_LABELS[facet as FacetKind] ?? facet
}
