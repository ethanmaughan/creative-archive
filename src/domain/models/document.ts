import { z } from 'zod'

export const DOCUMENT_KINDS = [
  'manuscript',
  'scene',
  'note',
  'world-rule',
  'character',
  'location',
  'research',
  'library-item',
  'document',
] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export const MEDIA_TYPES = [
  'book',
  'movie',
  'tv',
  'game',
  'article',
  'paper',
  'music',
  'experience',
  'dream',
  'observation',
] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

/** Frontmatter every document shares. Extra keys are preserved by the reconciler's raw
 *  frontmatter JSON; these schemas only validate the known fields. */
export const baseFrontmatterSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
})
export type BaseFrontmatter = z.infer<typeof baseFrontmatterSchema>

export const characterFrontmatterSchema = baseFrontmatterSchema.extend({
  role: z.string().optional(),
  aliases: z.array(z.string()).optional(),
})

export const locationFrontmatterSchema = baseFrontmatterSchema.extend({
  region: z.string().optional(),
})

export const libraryItemFrontmatterSchema = baseFrontmatterSchema.extend({
  mediaType: z.enum(MEDIA_TYPES),
  creator: z.string().optional(),
  year: z.number().int().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  /** User-entered date the media was consumed (YYYY-MM-DD). */
  consumedOn: z.string().optional(),
  /** App-stamped ISO datetime the entry was logged. */
  logged: z.string().optional(),
})

/** The schema to validate each document kind's frontmatter against. */
export const frontmatterSchemas = {
  manuscript: baseFrontmatterSchema,
  scene: baseFrontmatterSchema,
  note: baseFrontmatterSchema,
  'world-rule': baseFrontmatterSchema,
  character: characterFrontmatterSchema,
  location: locationFrontmatterSchema,
  research: baseFrontmatterSchema,
  'library-item': libraryItemFrontmatterSchema,
  document: baseFrontmatterSchema,
} satisfies Record<DocumentKind, z.ZodType>
