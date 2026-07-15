/**
 * The reconciler — the keystone of the file-canonical design (ADR-0001).
 *
 * Walks the archive via a `FileStore`, and for each canonical Markdown document:
 *   - parses frontmatter and ensures a stable `id` UUID (injecting one into the file
 *     if absent — the app, never the AI, does this);
 *   - hashes content to detect change;
 *   - upserts the derived `documents` row + its `documents_fts` entry, matching by
 *     **id** (not path) so external renames/moves survive.
 *
 * Documents whose files have disappeared are pruned, along with the polymorphic
 * `connections` and `taggings` that referenced them. A `rebuild` wipes the derived
 * tables first and reconstructs them from the folder — "delete the index, rebuild".
 */
import { type FileStore, normalizeRelPath } from '../file-store/file-store'
import {
  ensureId,
  parseFrontmatter,
  serializeFrontmatter,
  type Frontmatter,
} from '../file-store/frontmatter'
import { hashText } from './content-hash'
import type { Sqlite } from './migrator'

export type DocumentKind =
  | 'manuscript'
  | 'scene'
  | 'note'
  | 'world-rule'
  | 'character'
  | 'location'
  | 'research'
  | 'library-item'
  | 'document'

export interface ReconcileOptions {
  /** Wipe derived tables and rebuild from scratch. */
  readonly rebuild?: boolean
  readonly now?: () => string
  readonly generateId?: () => string
}

export interface ReconcileResult {
  readonly inserted: number
  readonly updated: number
  readonly deleted: number
  readonly unchanged: number
}

interface WorkspaceDef {
  readonly id: string
  readonly name: string
  readonly relPath: string
  readonly protection: 'canonical' | 'writable'
}

const WORKSPACES: readonly WorkspaceDef[] = [
  { id: 'ws-projects', name: 'Projects', relPath: 'projects', protection: 'canonical' },
  { id: 'ws-story-bible', name: 'Story Bible', relPath: 'story-bible', protection: 'canonical' },
  { id: 'ws-library', name: 'Library', relPath: 'library', protection: 'canonical' },
  { id: 'ws-research', name: 'Research', relPath: 'research', protection: 'canonical' },
  { id: 'ws-workspaces', name: 'AI Workspaces', relPath: 'workspaces', protection: 'writable' },
]

const WORKSPACE_BY_TOP = new Map(WORKSPACES.map((w) => [w.relPath, w]))

function topSegment(relPath: string): string {
  return relPath.split('/')[0] ?? ''
}

function basename(relPath: string): string {
  const name = relPath.split('/').pop() ?? relPath
  return name.replace(/\.md$/i, '')
}

/** A canonical, indexable document: a Markdown file inside a known workspace. */
function isIndexable(relPath: string): boolean {
  if (!relPath.toLowerCase().endsWith('.md')) return false
  if (relPath.startsWith('.creative-archive/')) return false
  return WORKSPACE_BY_TOP.has(topSegment(relPath))
}

function classifyKind(relPath: string): DocumentKind {
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

function extractTags(data: Frontmatter): string {
  const tags = data['tags']
  if (Array.isArray(tags)) return tags.filter((t) => typeof t === 'string').join(' ')
  if (typeof tags === 'string') return tags
  return ''
}

function titleFor(data: Frontmatter, relPath: string): string {
  const title = data['title']
  return typeof title === 'string' && title.length > 0 ? title : basename(relPath)
}

function ensureWorkspaces(db: Sqlite, now: () => string): void {
  for (const w of WORKSPACES) {
    db.run(
      `INSERT OR IGNORE INTO workspaces (id, name, rel_path, protection, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [w.id, w.name, w.relPath, w.protection, now()],
    )
  }
}

function rowidFor(db: Sqlite, id: string): number {
  const row = db.selectRows<{ rowid: number }>('SELECT rowid FROM documents WHERE id = ?;', [id])[0]
  if (!row) throw new Error(`Document row not found after write: ${id}`)
  return row.rowid
}

function writeFts(db: Sqlite, rowid: number, title: string, body: string, tags: string): void {
  db.run('INSERT INTO documents_fts (rowid, title, body, tags) VALUES (?, ?, ?, ?);', [
    rowid,
    title,
    body,
    tags,
  ])
}

function pruneReferences(db: Sqlite, documentId: string): void {
  db.run(
    `DELETE FROM connections
     WHERE (source_type = 'document' AND source_id = ?)
        OR (target_type = 'document' AND target_id = ?);`,
    [documentId, documentId],
  )
  db.run(`DELETE FROM taggings WHERE entity_type = 'document' AND entity_id = ?;`, [documentId])
}

export async function reconcile(
  fileStore: FileStore,
  db: Sqlite,
  options: ReconcileOptions = {},
): Promise<ReconcileResult> {
  const now = options.now ?? (() => new Date().toISOString())
  const generateId = options.generateId ?? (() => crypto.randomUUID())

  ensureWorkspaces(db, now)

  let priorIds: string[] = []
  if (options.rebuild) {
    priorIds = db.selectRows<{ id: string }>('SELECT id FROM documents;').map((r) => r.id)
    db.exec('DELETE FROM documents_fts; DELETE FROM documents;')
  }

  let inserted = 0
  let updated = 0
  let unchanged = 0
  const seen = new Set<string>()

  for await (const entry of fileStore.list()) {
    if (entry.kind !== 'file') continue
    const relPath = normalizeRelPath(entry.relPath)
    if (!isIndexable(relPath)) continue

    const raw = await fileStore.readTextFile(relPath)
    const parsed = parseFrontmatter(raw)
    const ensured = ensureId(parsed.data, generateId)

    let effectiveRaw = raw
    if (ensured.added) {
      effectiveRaw = serializeFrontmatter(ensured.data, parsed.body)
      await fileStore.writeTextFile(relPath, effectiveRaw)
    }

    const id = ensured.id
    seen.add(id)
    const contentHash = await hashText(effectiveRaw)
    const kind = classifyKind(relPath)
    const workspaceId = WORKSPACE_BY_TOP.get(topSegment(relPath))?.id ?? null
    const title = titleFor(ensured.data, relPath)
    const tags = extractTags(ensured.data)
    const frontmatterJson = JSON.stringify(ensured.data)

    const existing = db.selectRows<{ rowid: number; rel_path: string; content_hash: string }>(
      'SELECT rowid, rel_path, content_hash FROM documents WHERE id = ?;',
      [id],
    )[0]

    if (!existing) {
      db.run(
        `INSERT INTO documents
           (id, kind, rel_path, title, workspace_id, content_hash, frontmatter, file_mtime, indexed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [id, kind, relPath, title, workspaceId, contentHash, frontmatterJson, now(), now()],
      )
      writeFts(db, rowidFor(db, id), title, parsed.body, tags)
      inserted++
    } else if (existing.content_hash !== contentHash || existing.rel_path !== relPath) {
      db.run(
        `UPDATE documents
           SET kind = ?, rel_path = ?, title = ?, workspace_id = ?, content_hash = ?,
               frontmatter = ?, indexed_at = ?
         WHERE id = ?;`,
        [kind, relPath, title, workspaceId, contentHash, frontmatterJson, now(), id],
      )
      db.run('DELETE FROM documents_fts WHERE rowid = ?;', [existing.rowid])
      writeFts(db, existing.rowid, title, parsed.body, tags)
      updated++
    } else {
      unchanged++
    }
  }

  // Prune documents whose files are gone (plus their polymorphic references).
  let deleted = 0
  if (options.rebuild) {
    for (const id of priorIds) {
      if (!seen.has(id)) {
        pruneReferences(db, id)
        deleted++
      }
    }
  } else {
    const present = db.selectRows<{ id: string; rowid: number }>('SELECT id, rowid FROM documents;')
    for (const row of present) {
      if (seen.has(row.id)) continue
      db.run('DELETE FROM documents_fts WHERE rowid = ?;', [row.rowid])
      db.run('DELETE FROM documents WHERE id = ?;', [row.id])
      pruneReferences(db, row.id)
      deleted++
    }
  }

  return { inserted, updated, deleted, unchanged }
}
