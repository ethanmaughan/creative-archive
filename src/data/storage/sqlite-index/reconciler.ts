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
import {
  WORKSPACE_DEFS,
  classifyKind,
  isIndexablePath,
  workspaceForPath,
} from '@/domain/models/workspace'
import { MEDIA_TYPES, type DocumentKind } from '@/domain/models/document'
import { hashText } from './content-hash'
import type { Sqlite } from './migrator'

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

function basename(relPath: string): string {
  const name = relPath.split('/').pop() ?? relPath
  return name.replace(/\.md$/i, '')
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
  for (const w of WORKSPACE_DEFS) {
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

interface IndexContext {
  now: () => string
  generateId: () => string
}

/** Read one file, ensure its UUID, and upsert its index row + FTS entry. Matches by id. */
async function indexOneFile(
  fileStore: FileStore,
  db: Sqlite,
  relPath: string,
  ctx: IndexContext,
): Promise<{ id: string; outcome: 'inserted' | 'updated' | 'unchanged' }> {
  const raw = await fileStore.readTextFile(relPath)
  const parsed = parseFrontmatter(raw)
  const ensured = ensureId(parsed.data, ctx.generateId)

  let effectiveRaw = raw
  if (ensured.added) {
    effectiveRaw = serializeFrontmatter(ensured.data, parsed.body)
    await fileStore.writeTextFile(relPath, effectiveRaw)
  }

  const id = ensured.id
  const contentHash = await hashText(effectiveRaw)
  const kind = classifyKind(relPath)
  const workspaceId = workspaceForPath(relPath)?.id ?? null
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
      [id, kind, relPath, title, workspaceId, contentHash, frontmatterJson, ctx.now(), ctx.now()],
    )
    writeFts(db, rowidFor(db, id), title, parsed.body, tags)
    syncLibraryProjection(db, kind, id, ensured.data)
    return { id, outcome: 'inserted' }
  }
  if (existing.content_hash !== contentHash || existing.rel_path !== relPath) {
    db.run(
      `UPDATE documents
         SET kind = ?, rel_path = ?, title = ?, workspace_id = ?, content_hash = ?,
             frontmatter = ?, indexed_at = ?
       WHERE id = ?;`,
      [kind, relPath, title, workspaceId, contentHash, frontmatterJson, ctx.now(), id],
    )
    db.run('DELETE FROM documents_fts WHERE rowid = ?;', [existing.rowid])
    writeFts(db, existing.rowid, title, parsed.body, tags)
    syncLibraryProjection(db, kind, id, ensured.data)
    return { id, outcome: 'updated' }
  }
  return { id, outcome: 'unchanged' }
}

function removeDocument(db: Sqlite, id: string, rowid: number): void {
  db.run('DELETE FROM documents_fts WHERE rowid = ?;', [rowid])
  db.run('DELETE FROM documents WHERE id = ?;', [id])
  pruneReferences(db, id)
}

/** Keep the typed `library_items` projection in sync with a document's frontmatter.
 *  Non-library docs (or ones missing a valid mediaType) get no projection row. */
function syncLibraryProjection(
  db: Sqlite,
  kind: DocumentKind,
  documentId: string,
  data: Frontmatter,
): void {
  const mediaType = data['mediaType']
  const validMedia =
    kind === 'library-item' &&
    typeof mediaType === 'string' &&
    (MEDIA_TYPES as readonly string[]).includes(mediaType)

  if (!validMedia) {
    db.run('DELETE FROM library_items WHERE document_id = ?;', [documentId])
    return
  }

  const creator = typeof data['creator'] === 'string' ? data['creator'] : null
  const year = typeof data['year'] === 'number' ? data['year'] : null
  const consumedOn = typeof data['consumedOn'] === 'string' ? data['consumedOn'] : null
  const rating = typeof data['rating'] === 'number' ? data['rating'] : null

  db.run(
    `INSERT INTO library_items (document_id, media_type, creator, year, consumed_on, rating)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(document_id) DO UPDATE SET
       media_type = excluded.media_type, creator = excluded.creator, year = excluded.year,
       consumed_on = excluded.consumed_on, rating = excluded.rating;`,
    [documentId, mediaType as string, creator, year, consumedOn, rating],
  )
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

  const ctx: IndexContext = { now, generateId }
  for await (const entry of fileStore.list()) {
    if (entry.kind !== 'file') continue
    const relPath = normalizeRelPath(entry.relPath)
    if (!isIndexablePath(relPath)) continue
    const { id, outcome } = await indexOneFile(fileStore, db, relPath, ctx)
    seen.add(id)
    if (outcome === 'inserted') inserted++
    else if (outcome === 'updated') updated++
    else unchanged++
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
      removeDocument(db, row.id, row.rowid)
      deleted++
    }
  }

  return { inserted, updated, deleted, unchanged }
}

export type ReindexOutcome = 'inserted' | 'updated' | 'unchanged' | 'removed' | 'skipped'

export interface ReindexOptions {
  now?: () => string
  generateId?: () => string
}

/** Reconcile a single document by path — used right after the app writes a file, so we
 *  don't rescan the whole archive. Handles create/update and removal. */
export async function reindexOne(
  fileStore: FileStore,
  db: Sqlite,
  relPath: string,
  options: ReindexOptions = {},
): Promise<ReindexOutcome> {
  const rel = normalizeRelPath(relPath)
  if (!isIndexablePath(rel)) return 'skipped'

  const ctx: IndexContext = {
    now: options.now ?? (() => new Date().toISOString()),
    generateId: options.generateId ?? (() => crypto.randomUUID()),
  }
  ensureWorkspaces(db, ctx.now)

  const stat = await fileStore.stat(rel)
  if (!stat) {
    const existing = db.selectRows<{ id: string; rowid: number }>(
      'SELECT id, rowid FROM documents WHERE rel_path = ?;',
      [rel],
    )[0]
    if (existing) {
      removeDocument(db, existing.id, existing.rowid)
      return 'removed'
    }
    return 'skipped'
  }

  const { outcome } = await indexOneFile(fileStore, db, rel, ctx)
  return outcome
}
