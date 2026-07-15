/** The polymorphic connection graph — the product's spine. A connection may reference any
 *  entity by (type, id); the relationship label is free-form with a suggested vocabulary. */

export interface ConnectionRef {
  readonly type: string
  readonly id: string
}

export interface ConnectionInput {
  readonly source: ConnectionRef
  readonly target: ConnectionRef
  readonly relationship?: string
}

export const SUGGESTED_RELATIONSHIPS = [
  'references',
  'inspired-by',
  'contradicts',
  'appears-in',
  'related-to',
  'derived-from',
] as const
export type SuggestedRelationship = (typeof SUGGESTED_RELATIONSHIPS)[number]
