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
import { parseFacets } from '@/domain/services/parse-facets'
import { parseWikilinks, wikilinkKey, type ParsedWikilink } from '@/domain/services/parse-wikilinks'
import { normalizeTag, parseTags } from '@/domain/services/parse-tags'
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

/** Frontmatter tags as a normalized array. */
function frontmatterTags(data: Frontmatter): string[] {
  const tags = data['tags']
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === 'string')
  if (typeof tags === 'string') return tags.split(/[\s,]+/)
  return []
}

/** Sync a document's tags (frontmatter tags ∪ inline `#tags`) into tags + taggings. */
function syncTags(db: Sqlite, documentId: string, data: Frontmatter, body: string): void {
  const names = new Set<string>()
  for (const t of frontmatterTags(data)) {
    const name = normalizeTag(t)
    if (name !== '') names.add(name)
  }
  for (const name of parseTags(body)) names.add(name)

  db.run('DELETE FROM taggings WHERE entity_type = ? AND entity_id = ?;', ['document', documentId])
  for (const name of names) {
    db.run('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?);', [name, name])
    db.run('INSERT OR IGNORE INTO taggings (tag_id, entity_type, entity_id) VALUES (?, ?, ?);', [
      name,
      'document',
      documentId,
    ])
  }
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
): Promise<{
  id: string
  outcome: 'inserted' | 'updated' | 'unchanged'
  wikilinks: ParsedWikilink[]
}> {
  const raw = await fileStore.readTextFile(relPath)
  const parsed = parseFrontmatter(raw)
  const wikilinks = parseWikilinks(parsed.body)
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
    syncExtractionFacets(db, kind, id, parsed.body)
    syncTags(db, id, ensured.data, parsed.body)
    return { id, outcome: 'inserted', wikilinks }
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
    syncExtractionFacets(db, kind, id, parsed.body)
    syncTags(db, id, ensured.data, parsed.body)
    return { id, outcome: 'updated', wikilinks }
  }
  return { id, outcome: 'unchanged', wikilinks }
}

function removeDocument(db: Sqlite, id: string, rowid: number): void {
  db.run('DELETE FROM documents_fts WHERE rowid = ?;', [rowid])
  db.run('DELETE FROM documents WHERE id = ?;', [id])
  pruneReferences(db, id)
  // Drop the doc's own wikilinks; leave inbound links but mark them unresolved (broken).
  db.run('DELETE FROM links WHERE source_id = ?;', [id])
  db.run('UPDATE links SET target_id = NULL WHERE target_id = ?;', [id])
}

// --- wikilink graph (derived from bodies) ---

/** Resolve a wikilink target to a document id by title or filename (case-insensitive). */
function buildLinkResolver(db: Sqlite): (text: string) => string | null {
  const rows = db.selectRows<{ id: string; title: string | null; rel_path: string }>(
    'SELECT id, title, rel_path FROM documents;',
  )
  const byKey = new Map<string, string>()
  for (const row of rows) {
    byKey.set(wikilinkKey(basename(row.rel_path)), row.id)
    if (row.title) byKey.set(wikilinkKey(row.title), row.id)
  }
  return (text) => byKey.get(wikilinkKey(text)) ?? null
}

function insertLinks(
  db: Sqlite,
  sourceId: string,
  wikilinks: readonly ParsedWikilink[],
  resolve: (text: string) => string | null,
  now: () => string,
): void {
  for (const link of wikilinks) {
    db.run(
      'INSERT INTO links (source_id, target_text, target_id, alias, created_at) VALUES (?, ?, ?, ?, ?);',
      [sourceId, link.target, resolve(link.target), link.alias, now()],
    )
  }
}

/** Full rebuild of the derived link graph from every document's parsed wikilinks. */
function rebuildLinks(db: Sqlite, linkMap: Map<string, ParsedWikilink[]>, now: () => string): void {
  db.exec('DELETE FROM links;')
  const resolve = buildLinkResolver(db)
  for (const [sourceId, wikilinks] of linkMap) insertLinks(db, sourceId, wikilinks, resolve, now)
}

/** Replace one document's outbound links (used by reindexOne after a single-file write). */
function syncLinksForDoc(
  db: Sqlite,
  sourceId: string,
  wikilinks: readonly ParsedWikilink[],
  now: () => string,
): void {
  db.run('DELETE FROM links WHERE source_id = ?;', [sourceId])
  insertLinks(db, sourceId, wikilinks, buildLinkResolver(db), now)
}

/** A (possibly newly created/renamed) document may satisfy previously-broken inbound links. */
function resolveInboundLinks(db: Sqlite, id: string): void {
  const doc = db.selectRows<{ title: string | null; rel_path: string }>(
    'SELECT title, rel_path FROM documents WHERE id = ?;',
    [id],
  )[0]
  if (!doc) return
  const keys = new Set([wikilinkKey(basename(doc.rel_path))])
  if (doc.title) keys.add(wikilinkKey(doc.title))
  for (const key of keys) {
    db.run(
      'UPDATE links SET target_id = ? WHERE target_id IS NULL AND lower(trim(target_text)) = ?;',
      [id, key],
    )
  }
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
  const logged = typeof data['logged'] === 'string' ? data['logged'] : null

  db.run(
    `INSERT INTO library_items (document_id, media_type, creator, year, consumed_on, rating, logged)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(document_id) DO UPDATE SET
       media_type = excluded.media_type, creator = excluded.creator, year = excluded.year,
       consumed_on = excluded.consumed_on, rating = excluded.rating, logged = excluded.logged;`,
    [documentId, mediaType as string, creator, year, consumedOn, rating, logged],
  )
}

/** Keep the queryable `extraction_facets` projection in sync with a library item's body
 *  sections. Fully replaced each index; only library items have facets. */
function syncExtractionFacets(
  db: Sqlite,
  kind: DocumentKind,
  documentId: string,
  body: string,
): void {
  db.run('DELETE FROM extraction_facets WHERE document_id = ?;', [documentId])
  if (kind !== 'library-item') return
  parseFacets(body).forEach((facet, index) => {
    db.run('INSERT INTO extraction_facets (id, document_id, facet, content) VALUES (?, ?, ?, ?);', [
      `${documentId}::${facet.facet}::${index}`,
      documentId,
      facet.facet,
      facet.content,
    ])
  })
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
  const linkMap = new Map<string, ParsedWikilink[]>()
  for (const entry of await fileStore.list()) {
    if (entry.kind !== 'file') continue
    const relPath = normalizeRelPath(entry.relPath)
    if (!isIndexablePath(relPath)) continue
    const { id, outcome, wikilinks } = await indexOneFile(fileStore, db, relPath, ctx)
    seen.add(id)
    linkMap.set(id, wikilinks)
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

  // Rebuild the derived wikilink graph now that every document is indexed (so targets resolve).
  rebuildLinks(db, linkMap, now)

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

  const { id, outcome, wikilinks } = await indexOneFile(fileStore, db, rel, ctx)
  // Refresh this doc's outbound links, and resolve any broken inbound links it now satisfies.
  syncLinksForDoc(db, id, wikilinks, ctx.now)
  resolveInboundLinks(db, id)
  return outcome
}
