/**
 * Workspace registry + path classification — pure domain logic that formalizes what the
 * reconciler previously handled inline. Path-based, no IO.
 */
import type { DocumentKind } from './document'

export type Protection = 'canonical' | 'writable'

export interface WorkspaceDef {
  readonly id: string
  readonly name: string
  readonly relPath: string
  readonly protection: Protection
}

export const WORKSPACE_DEFS: readonly WorkspaceDef[] = [
  { id: 'ws-spaces', name: 'Spaces', relPath: 'spaces', protection: 'canonical' },
  { id: 'ws-story-bible', name: 'Story Bible', relPath: 'story-bible', protection: 'canonical' },
  { id: 'ws-library', name: 'Library', relPath: 'library', protection: 'canonical' },
  { id: 'ws-research', name: 'Research', relPath: 'research', protection: 'canonical' },
  { id: 'ws-notebook', name: 'Notebook', relPath: 'notebook', protection: 'canonical' },
  { id: 'ws-workspaces', name: 'AI Workspaces', relPath: 'workspaces', protection: 'writable' },
]

const BY_TOP = new Map(WORKSPACE_DEFS.map((w) => [w.relPath, w]))

export function topSegment(relPath: string): string {
  return relPath.split('/')[0] ?? ''
}

export function workspaceForPath(relPath: string): WorkspaceDef | undefined {
  return BY_TOP.get(topSegment(relPath))
}

/**
 * App-managed data folders that hold neither indexable documents nor read-only sources — e.g.
 * the CSV-backed query tracker. They live in the archive folder (findable, spreadsheet-editable)
 * but are kept out of the document + source indexes so they don't clutter search or the Files list.
 */
export const RESERVED_DATA_DIRS: readonly string[] = ['query-tracker']

export function isReservedDataPath(relPath: string): boolean {
  return RESERVED_DATA_DIRS.includes(topSegment(relPath))
}

/** A canonical, indexable document: a Markdown file inside a known workspace. */
export function isIndexablePath(relPath: string): boolean {
  if (!relPath.toLowerCase().endsWith('.md')) return false
  if (relPath.startsWith('.creative-archive/')) return false
  return BY_TOP.has(topSegment(relPath))
}

export function classifyKind(relPath: string): DocumentKind {
  if (relPath.startsWith('library/')) return 'library-item'
  if (relPath.startsWith('story-bible/characters/')) return 'character'
  if (relPath.startsWith('story-bible/locations/')) return 'location'
  if (relPath.startsWith('research/')) return 'research'
  if (relPath.startsWith('notebook/')) return 'note'
  const inSpace = /^spaces\/[^/]+\/(.+)$/.exec(relPath)
  if (inSpace) {
    const rest = inSpace[1] ?? ''
    if (rest === 'space.md') return 'space'
    switch (rest.split('/')[0]) {
      case 'manuscript':
        return 'manuscript'
      case 'scenes':
        return 'scene'
      case 'notes':
        return 'note'
      case 'world-rules':
        return 'world-rule'
      default:
        return 'document'
    }
  }
  return 'document'
}
