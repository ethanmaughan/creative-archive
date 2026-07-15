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
  { id: 'ws-projects', name: 'Projects', relPath: 'projects', protection: 'canonical' },
  { id: 'ws-story-bible', name: 'Story Bible', relPath: 'story-bible', protection: 'canonical' },
  { id: 'ws-library', name: 'Library', relPath: 'library', protection: 'canonical' },
  { id: 'ws-research', name: 'Research', relPath: 'research', protection: 'canonical' },
  { id: 'ws-workspaces', name: 'AI Workspaces', relPath: 'workspaces', protection: 'writable' },
]

const BY_TOP = new Map(WORKSPACE_DEFS.map((w) => [w.relPath, w]))

export function topSegment(relPath: string): string {
  return relPath.split('/')[0] ?? ''
}

export function workspaceForPath(relPath: string): WorkspaceDef | undefined {
  return BY_TOP.get(topSegment(relPath))
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
  const inProject = /^projects\/[^/]+\/([^/]+)\//.exec(relPath)
  if (inProject) {
    switch (inProject[1]) {
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
