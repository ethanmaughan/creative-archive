/**
 * Reconcile the read-only `source_files` index against the archive folder — the sibling of
 * the document reconciler, for files we do NOT author. It walks every visible non-document
 * file, extracts searchable text where it can, and upserts a row keyed by path. Files gone
 * from disk are pruned. It never writes to a source file.
 *
 * Change detection is by (size, mtime): unchanged files skip re-extraction, so re-opening an
 * archive full of PDFs is cheap.
 */
import { type FileStore, normalizeRelPath } from '../storage/file-store/file-store'
import { hashText } from '../storage/sqlite-index/content-hash'
import type { Sqlite } from '../storage/sqlite-index/migrator'
import {
  basenameOf,
  categoryForExt,
  extForPath,
  isSourceFilePath,
  isTextExtractable,
} from '@/domain/models/source-file'
import { extractText } from './extract-text'

export interface SourceReconcileResult {
  readonly inserted: number
  readonly updated: number
  readonly deleted: number
  readonly unchanged: number
}

interface ExistingRow {
  id: number
  size: number
  file_mtime: number
  content_hash: string
}

function writeSourceFts(
  db: Sqlite,
  rowid: number,
  title: string,
  body: string,
  path: string,
): void {
  db.run('INSERT INTO source_files_fts (rowid, title, body, path) VALUES (?, ?, ?, ?);', [
    rowid,
    title,
    body,
    path,
  ])
}

async function indexOneSource(
  store: FileStore,
  db: Sqlite,
  relPath: string,
  now: () => string,
): Promise<'inserted' | 'updated' | 'unchanged'> {
  const stat = await store.stat(relPath)
  const size = stat?.size ?? 0
  const mtime = stat?.mtime ?? 0
  const ext = extForPath(relPath)
  const category = categoryForExt(ext)
  const title = basenameOf(relPath)

  const existing = db.selectRows<ExistingRow>(
    'SELECT id, size, file_mtime, content_hash FROM source_files WHERE rel_path = ?;',
    [relPath],
  )[0]

  // Fast path: same bytes on disk → nothing to do (avoids re-parsing docx/pdf every open).
  if (existing && existing.size === size && existing.file_mtime === mtime) {
    return 'unchanged'
  }

  const { text, hasText } = isTextExtractable(category)
    ? await extractText(store, relPath, category)
    : { text: '', hasText: false }
  const contentHash = await hashText(`${size}:${mtime}:${text}`)

  if (existing && existing.content_hash === contentHash) {
    // Metadata drifted but content is identical — refresh the mtime, leave FTS as-is.
    db.run('UPDATE source_files SET size = ?, file_mtime = ?, indexed_at = ? WHERE id = ?;', [
      size,
      mtime,
      now(),
      existing.id,
    ])
    return 'unchanged'
  }

  if (existing) {
    db.run(
      `UPDATE source_files
         SET ext = ?, category = ?, title = ?, size = ?, file_mtime = ?, content_hash = ?,
             has_text = ?, indexed_at = ?
       WHERE id = ?;`,
      [ext, category, title, size, mtime, contentHash, hasText ? 1 : 0, now(), existing.id],
    )
    db.run('DELETE FROM source_files_fts WHERE rowid = ?;', [existing.id])
    writeSourceFts(db, existing.id, title, text, relPath)
    return 'updated'
  }

  db.run(
    `INSERT INTO source_files
       (rel_path, ext, category, title, size, file_mtime, content_hash, has_text, indexed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [relPath, ext, category, title, size, mtime, contentHash, hasText ? 1 : 0, now()],
  )
  const row = db.selectRows<{ id: number }>('SELECT id FROM source_files WHERE rel_path = ?;', [
    relPath,
  ])[0]
  if (row) writeSourceFts(db, row.id, title, text, relPath)
  return 'inserted'
}

export async function reconcileSources(
  store: FileStore,
  db: Sqlite,
  options: { now?: () => string } = {},
): Promise<SourceReconcileResult> {
  const now = options.now ?? (() => new Date().toISOString())

  let inserted = 0
  let updated = 0
  let unchanged = 0
  const seen = new Set<string>()

  for (const entry of await store.list()) {
    if (entry.kind !== 'file') continue
    const relPath = normalizeRelPath(entry.relPath)
    if (!isSourceFilePath(relPath)) continue
    seen.add(relPath)
    const outcome = await indexOneSource(store, db, relPath, now)
    if (outcome === 'inserted') inserted++
    else if (outcome === 'updated') updated++
    else unchanged++
  }

  let deleted = 0
  const present = db.selectRows<{ id: number; rel_path: string }>(
    'SELECT id, rel_path FROM source_files;',
  )
  for (const row of present) {
    if (seen.has(row.rel_path)) continue
    db.run('DELETE FROM source_files_fts WHERE rowid = ?;', [row.id])
    db.run('DELETE FROM source_files WHERE id = ?;', [row.id])
    deleted++
  }

  return { inserted, updated, deleted, unchanged }
}

/** Reconcile a single source path after a targeted change (create/delete). */
export async function reindexOneSource(
  store: FileStore,
  db: Sqlite,
  relPath: string,
  options: { now?: () => string } = {},
): Promise<'inserted' | 'updated' | 'unchanged' | 'removed' | 'skipped'> {
  const rel = normalizeRelPath(relPath)
  if (!isSourceFilePath(rel)) return 'skipped'
  const now = options.now ?? (() => new Date().toISOString())

  const stat = await store.stat(rel)
  if (!stat) {
    const existing = db.selectRows<{ id: number }>(
      'SELECT id FROM source_files WHERE rel_path = ?;',
      [rel],
    )[0]
    if (existing) {
      db.run('DELETE FROM source_files_fts WHERE rowid = ?;', [existing.id])
      db.run('DELETE FROM source_files WHERE id = ?;', [existing.id])
      return 'removed'
    }
    return 'skipped'
  }
  return indexOneSource(store, db, rel, now)
}
