/**
 * Spaces — user-created workspaces inside the one archive. Each lives at `spaces/<slug>/`
 * with a `space.md` marker and holds authored documents in typed subfolders. The archive root
 * still holds the shared, cross-space material (library / research / notebook / story-bible).
 *
 * Pure, path-based logic. No IO.
 */
export const SPACE_TYPES = ['writing', 'study', 'general'] as const
export type SpaceType = (typeof SPACE_TYPES)[number]

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  writing: 'Writing project',
  study: 'Study / class',
  general: 'General',
}

/** Authored-document kinds a user can create inside a space. */
export type SpaceDocKind = 'manuscript' | 'scene' | 'note' | 'world-rule' | 'document'

/** Which doc kinds the "+ New" menu offers, by space type. */
export function docKindsForSpaceType(type: SpaceType): SpaceDocKind[] {
  switch (type) {
    case 'writing':
      return ['manuscript', 'scene', 'note', 'world-rule']
    case 'study':
      return ['note', 'document']
    case 'general':
      return ['note', 'document']
  }
}

/** The subfolder under `spaces/<slug>/` that holds a given doc kind. */
export function subfolderForSpaceKind(kind: SpaceDocKind): string {
  switch (kind) {
    case 'manuscript':
      return 'manuscript'
    case 'scene':
      return 'scenes'
    case 'note':
      return 'notes'
    case 'world-rule':
      return 'world-rules'
    case 'document':
      return 'docs'
  }
}

const SPACE_PATH = /^spaces\/([^/]+)(?:\/(.*))?$/

/** The slug of the space a path belongs to, or null if it isn't inside a space. */
export function spaceSlugFromPath(relPath: string): string | null {
  return SPACE_PATH.exec(relPath)?.[1] ?? null
}

export function spaceRootPath(slug: string): string {
  return `spaces/${slug}`
}

export function spaceMarkerPath(slug: string): string {
  return `spaces/${slug}/space.md`
}

/** A path prefix that matches everything inside a space (for scoped queries). */
export function spacePathPrefix(slug: string): string {
  return `spaces/${slug}/`
}

export function isSpaceType(value: unknown): value is SpaceType {
  return typeof value === 'string' && (SPACE_TYPES as readonly string[]).includes(value)
}
