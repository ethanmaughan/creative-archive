/** Creative-extraction facet kinds — the queryable slices drawn from a library item. */
export const FACET_KINDS = [
  'review',
  'technique',
  'theme',
  'atmosphere',
  'imagery',
  'dialogue',
  'structure',
  'worldbuilding',
  'note',
] as const
export type FacetKind = (typeof FACET_KINDS)[number]
