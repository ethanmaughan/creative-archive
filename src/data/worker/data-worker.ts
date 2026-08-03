/**
 * The data worker — owns the FileStore, the OPFS SQLite index, and the reconciler, all off
 * the main thread (OPFS SAHPool requires a Worker context anyway). The UI talks to it via
 * Comlink as if these were local async calls.
 */
import * as Comlink from 'comlink'
import { FsaFileStore } from '@/data/storage/file-store/fsa-adapter/fsa-file-store'
import { type FileStore, normalizeRelPath } from '@/data/storage/file-store/file-store'
import {
  ensureId,
  parseFrontmatter,
  serializeFrontmatter,
} from '@/data/storage/file-store/frontmatter'
import { openOpfs } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile, reindexOne } from '@/data/storage/sqlite-index/reconciler'
import { reconcileSources } from '@/data/ingest/reconcile-sources'
import { extractText } from '@/data/ingest/extract-text'
import { DocumentRepository, type DocumentRecord } from '@/data/repositories/document-repository'
import { SourceRepository } from '@/data/repositories/source-repository'
import { SpaceRepository } from '@/data/repositories/space-repository'
import { LibraryRepository } from '@/data/repositories/library-repository'
import { ExtractionRepository } from '@/data/repositories/extraction-repository'
import { LinkRepository, type ReferenceSource } from '@/data/repositories/link-repository'
import { GraphRepository } from '@/data/repositories/graph-repository'
import { TagRepository } from '@/data/repositories/tag-repository'
import { classifyKind, isIndexablePath } from '@/domain/models/workspace'
import {
  basenameOf,
  categoryForExt,
  extForPath,
  isSourceFilePath,
  isTextExtractable,
  type SourceCategory,
} from '@/domain/models/source-file'
import { spaceMarkerPath, spacePathPrefix, subfolderForSpaceKind } from '@/domain/models/space'
import { parseBlocks, extractHeadingSection } from '@/domain/services/parse-blocks'
import { parseQuery } from '@/domain/services/parse-query'
import { wikilinkKey } from '@/domain/services/parse-wikilinks'
import { extractLinkContexts } from '@/domain/services/link-context'
import { OllamaClient } from '@/data/ai/ollama-client'
import { checkConsistency, suggestEdits, summarizeDocument } from '@/data/ai/ai-service'
import type { AiClient } from '@/data/ai/ai-client'
import { QueryTrackerRepository } from '@/data/repositories/query-tracker-repository'
import { canTransition } from '@/domain/services/submission-workflow'
import type { SubmissionStatus } from '@/domain/models/submission'
import {
  AGENT_COLUMNS,
  agentToRecord,
  agentsCsvPath,
  manuscriptSlugFromPath,
  recordToAgent,
  type Agent,
} from '@/domain/models/agent'
import { parseCsvRecords, recordsToCsv } from '@/shared/csv'
import { slugify } from '@/shared/slug'
import { buildSnippet, queryTerms, toFtsQuery } from './fts-query'
import type {
  CreatableKind,
  CreateDocumentInput,
  CreateLibraryItemInput,
  CreateMarketInput,
  CreateSubmissionInput,
  CreateSpaceInput,
  CreateSpaceDocInput,
  DataApi,
  DocumentContent,
  DocumentDTO,
  OpenResult,
  ReferenceDTO,
  SaveDocumentPatch,
  SearchResultDTO,
  SourceContentDTO,
  SpaceDTO,
  TopicPageDTO,
  TreeEntryDTO,
} from './types'

let db: Sqlite | null = null
let store: FileStore | null = null
let documents: DocumentRepository | null = null
let sources: SourceRepository | null = null
let spaces: SpaceRepository | null = null
let library: LibraryRepository | null = null
let extraction: ExtractionRepository | null = null
let links: LinkRepository | null = null
let graph: GraphRepository | null = null
let tags: TagRepository | null = null
let queryTracker: QueryTrackerRepository | null = null
const aiClient: AiClient = new OllamaClient()

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** Target folder for each creatable, project-independent document kind. */
const CREATE_FOLDER: Record<CreatableKind, string> = {
  character: 'story-bible/characters',
  location: 'story-bible/locations',
  note: 'notebook',
  research: 'research',
}

function toDto(record: DocumentRecord): DocumentDTO {
  return {
    id: record.id,
    kind: record.kind,
    relPath: record.relPath,
    title: record.title,
    workspaceId: record.workspaceId,
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function toContent(relPath: string, data: Record<string, unknown>, body: string): DocumentContent {
  return {
    relPath,
    id: asString(data['id']) ?? '',
    kind: classifyKind(normalizeRelPath(relPath)),
    title: asString(data['title']),
    body,
  }
}

function requireOpen(): { db: Sqlite; store: FileStore } {
  if (!db || !store) throw new Error('No archive is open')
  return { db, store }
}

/** The keys a `[[wikilink]]` can use to name this target: its title and its filename. */
function targetKeys(title: string | null, relPath: string): Set<string> {
  const keys = new Set<string>()
  if (title) keys.add(wikilinkKey(title))
  keys.add(wikilinkKey(basenameOf(relPath).replace(/\.md$/i, '')))
  return keys
}

/** For each source that links to a target, pull the line(s) where the link appears. */
async function buildReferences(
  fileStore: FileStore,
  sources: readonly ReferenceSource[],
  keys: Set<string>,
): Promise<ReferenceDTO[]> {
  const out: ReferenceDTO[] = []
  for (const s of sources) {
    let contexts: string[] = []
    try {
      const raw = await fileStore.readTextFile(s.relPath)
      contexts = extractLinkContexts(parseFrontmatter(raw).body, keys)
    } catch {
      // Source vanished between indexing and reading — list it without context.
    }
    out.push({ sourceId: s.sourceId, relPath: s.relPath, title: s.title, kind: s.kind, contexts })
  }
  return out
}

async function ensureDb(): Promise<{ db: Sqlite; documents: DocumentRepository }> {
  if (!db) {
    db = await openOpfs()
    applyMigrations(db, MIGRATIONS)
    documents = new DocumentRepository(db)
    sources = new SourceRepository(db)
    spaces = new SpaceRepository(db)
    library = new LibraryRepository(db)
    extraction = new ExtractionRepository(db)
    links = new LinkRepository(db)
    graph = new GraphRepository(db)
    tags = new TagRepository(db)
    queryTracker = new QueryTrackerRepository(db)
  }
  return { db, documents: documents! }
}

const api: DataApi = {
  async openArchive(handle) {
    const ready = await ensureDb()
    store = new FsaFileStore(handle)
    const result = await reconcile(store, ready.db)
    await reconcileSources(store, ready.db)
    return { docCount: ready.documents.all().length, ...result } satisfies OpenResult
  },

  // Desktop: the native FileStore lives on the main thread (Tauri APIs), handed in as a
  // Comlink proxy. Everything downstream is identical — it's just a FileStore.
  async openArchiveNative(nativeStore: FileStore) {
    const ready = await ensureDb()
    store = nativeStore
    const result = await reconcile(store, ready.db)
    await reconcileSources(store, ready.db)
    return { docCount: ready.documents.all().length, ...result } satisfies OpenResult
  },

  async reconcile() {
    const open = requireOpen()
    const result = await reconcile(open.store, open.db)
    await reconcileSources(open.store, open.db)
    return { docCount: documents?.all().length ?? 0, ...result } satisfies OpenResult
  },

  async listDocuments() {
    return documents ? documents.all().map(toDto) : []
  },

  async search(query: string, kind?: string, scope?: string) {
    if (!store) return []
    const fts = toFtsQuery(query)
    if (fts === '') return []
    const terms = queryTerms(query)
    const results: SearchResultDTO[] = []

    // A `scope` is a space slug — narrow every hit to that space's folder.
    const pathPrefix = scope !== undefined && scope !== '' ? spacePathPrefix(scope) : undefined

    // `kind === 'source'` narrows to uploaded files; any other kind narrows to that document
    // kind; omitting kind searches both documents and sources.
    const wantDocuments = kind !== 'source'
    const wantSources = kind === undefined || kind === 'source'

    if (wantDocuments && documents) {
      const docKind = kind !== undefined && kind !== 'source' ? kind : undefined
      const hits = documents.search(fts, {
        limit: 20,
        ...(docKind !== undefined ? { kind: docKind } : {}),
        ...(pathPrefix !== undefined ? { pathPrefix } : {}),
      })
      for (const hit of hits) {
        let snippet = ''
        try {
          const raw = await store.readTextFile(hit.relPath)
          snippet = buildSnippet(parseFrontmatter(raw).body, terms)
        } catch {
          // File may have vanished between indexing and reading; show the hit without a snippet.
        }
        results.push({
          id: hit.id,
          relPath: hit.relPath,
          title: hit.title,
          kind: hit.kind,
          snippet,
        })
      }
    }

    if (wantSources && sources) {
      for (const hit of sources.search(fts, 20, pathPrefix)) {
        let snippet = ''
        try {
          const { text } = await extractText(store, hit.relPath, hit.category as SourceCategory)
          snippet = buildSnippet(text, terms)
        } catch {
          // Unreadable source — show the hit without a snippet.
        }
        results.push({
          id: `source:${hit.relPath}`,
          relPath: hit.relPath,
          title: hit.title,
          kind: 'source',
          snippet,
        })
      }
    }
    return results
  },

  async listTree() {
    if (!documents || !sources) return []
    const entries: TreeEntryDTO[] = []
    for (const d of documents.all()) {
      entries.push({
        relPath: d.relPath,
        name: basenameOf(d.relPath),
        nodeKind: 'document',
        title: d.title,
        docKind: d.kind,
      })
    }
    for (const s of sources.all()) {
      entries.push({
        relPath: s.relPath,
        name: basenameOf(s.relPath),
        nodeKind: 'source',
        category: s.category,
        ext: s.ext,
        hasText: s.hasText,
      })
    }
    return entries
  },

  async readSource(relPath): Promise<SourceContentDTO | null> {
    if (!store) return null
    const rel = normalizeRelPath(relPath)
    if (!isSourceFilePath(rel)) return null
    const stat = await store.stat(rel)
    if (!stat) return null
    const ext = extForPath(rel)
    const category = categoryForExt(ext)
    const { text, hasText } = isTextExtractable(category)
      ? await extractText(store, rel, category)
      : { text: '', hasText: false }
    return { relPath: rel, name: basenameOf(rel), ext, category, size: stat.size, hasText, text }
  },

  async readSourceBytes(relPath) {
    if (!store) return null
    const rel = normalizeRelPath(relPath)
    if (!isSourceFilePath(rel)) return null
    try {
      return await store.readBinaryFile(rel)
    } catch {
      return null
    }
  },

  async readDocument(relPath) {
    if (!store) return null
    let raw: string
    try {
      raw = await store.readTextFile(relPath)
    } catch {
      return null
    }
    const parsed = parseFrontmatter(raw)
    return toContent(relPath, parsed.data, parsed.body)
  },

  async saveDocument(relPath, patch: SaveDocumentPatch) {
    const open = requireOpen()
    // Sources are read-only by construction — never rewrite a file we didn't author.
    if (!isIndexablePath(normalizeRelPath(relPath))) {
      throw new Error('This is a read-only source file and cannot be edited here.')
    }
    const raw = await open.store.readTextFile(relPath)
    const parsed = parseFrontmatter(raw)
    const data: Record<string, unknown> = { ...parsed.data }
    if (patch.title !== undefined) data['title'] = patch.title
    const content = serializeFrontmatter(data, patch.body)
    await open.store.writeTextFile(relPath, content)
    await reindexOne(open.store, open.db, relPath)
    return toContent(relPath, data, patch.body)
  },

  async createDocument(input: CreateDocumentInput) {
    const open = requireOpen()
    const id = crypto.randomUUID()
    const slug = slugify(input.title)
    const folder = CREATE_FOLDER[input.kind]
    let relPath = `${folder}/${slug}.md`
    if (await open.store.stat(relPath)) {
      relPath = `${folder}/${slug}-${id.slice(0, 8)}.md`
    }
    const data: Record<string, unknown> = ensureId({ title: input.title }, () => id).data
    const content = serializeFrontmatter(data, '')
    await open.store.writeTextFile(relPath, content)
    await reindexOne(open.store, open.db, relPath)
    return toContent(relPath, data, '')
  },

  async listSpaces() {
    return spaces ? spaces.all() : []
  },

  async createSpace(input: CreateSpaceInput): Promise<SpaceDTO> {
    const open = requireOpen()
    const id = crypto.randomUUID()
    const base = slugify(input.title)
    let slug = base
    if (await open.store.stat(spaceMarkerPath(slug))) slug = `${base}-${id.slice(0, 8)}`
    const relPath = spaceMarkerPath(slug)
    const data: Record<string, unknown> = { id, title: input.title, spaceType: input.spaceType }
    await open.store.writeTextFile(relPath, serializeFrontmatter(data, ''))
    await reindexOne(open.store, open.db, relPath)
    return { id, slug, relPath, title: input.title, spaceType: input.spaceType, docCount: 0 }
  },

  async createSpaceDocument(input: CreateSpaceDocInput) {
    const open = requireOpen()
    const id = crypto.randomUUID()
    const folder = `spaces/${input.spaceSlug}/${subfolderForSpaceKind(input.kind)}`
    const slug = slugify(input.title)
    // Manuscript chapters get a numeric filename prefix so they order in the folder and index.
    let prefix = ''
    if (input.kind === 'manuscript') {
      const n =
        open.db.selectRows<{ n: number }>(
          'SELECT count(*) AS n FROM documents WHERE rel_path LIKE ?;',
          [`${folder}/%`],
        )[0]?.n ?? 0
      prefix = `${String((n + 1) * 10).padStart(3, '0')}-`
    }
    let relPath = `${folder}/${prefix}${slug}.md`
    if (await open.store.stat(relPath)) {
      relPath = `${folder}/${prefix}${slug}-${id.slice(0, 8)}.md`
    }
    const data: Record<string, unknown> = ensureId({ title: input.title }, () => id).data
    await open.store.writeTextFile(relPath, serializeFrontmatter(data, ''))
    await reindexOne(open.store, open.db, relPath)
    return toContent(relPath, data, '')
  },

  async listLibraryItems(sort) {
    return library ? library.all(sort) : []
  },

  async createLibraryItem(input: CreateLibraryItemInput) {
    const open = requireOpen()
    const id = crypto.randomUUID()
    const slug = slugify(input.title)
    const folder = `library/${input.mediaType}`
    let relPath = `${folder}/${slug}.md`
    if (await open.store.stat(relPath)) {
      relPath = `${folder}/${slug}-${id.slice(0, 8)}.md`
    }
    const data: Record<string, unknown> = {
      id,
      title: input.title,
      mediaType: input.mediaType,
    }
    if (input.creator !== undefined) data['creator'] = input.creator
    if (input.year !== undefined) data['year'] = input.year
    if (input.rating !== undefined) data['rating'] = input.rating
    if (input.consumedOn !== undefined && input.consumedOn !== '') {
      data['consumedOn'] = input.consumedOn
    }
    // The app stamps when the entry was logged (date + time); the user never types this.
    data['logged'] = new Date().toISOString()
    const body = input.body ?? ''
    await open.store.writeTextFile(relPath, serializeFrontmatter(data, body))
    await reindexOne(open.store, open.db, relPath)
    return toContent(relPath, data, body)
  },

  async listFacets(facet?: string) {
    return extraction ? extraction.all(facet) : []
  },

  async listReferences(documentId: string): Promise<ReferenceDTO[]> {
    if (!links || !documents || !store) return []
    const doc = documents.all().find((d) => d.id === documentId)
    if (!doc) return []
    return buildReferences(store, links.referencesTo(documentId), targetKeys(doc.title, doc.relPath))
  },

  async topicPage(name: string): Promise<TopicPageDTO> {
    const trimmed = name.trim()
    const empty: TopicPageDTO = { name: trimmed, definition: null, references: [] }
    if (!links || !documents || !store || trimmed === '') return empty
    const key = wikilinkKey(trimmed)
    // Does a note already define this topic (by title or filename)? Then it *is* the page.
    const def = documents.all().find((d) => targetKeys(d.title, d.relPath).has(key))
    if (def) return { name: trimmed, definition: toDto(def), references: [] }
    // Un-filed topic: gather everything that links to the bare name, with context.
    const references = await buildReferences(store, links.referencesToText([key]), new Set([key]))
    return { name: trimmed, definition: null, references }
  },

  async listTags() {
    return tags ? tags.all() : []
  },

  async listDocumentsByTag(name: string) {
    if (!tags) return []
    return tags.documentsForTag(name).map((d) => ({
      id: d.id,
      kind: d.kind,
      relPath: d.relPath,
      title: d.title,
      workspaceId: null,
    }))
  },

  async listDocumentTags(documentId: string) {
    return tags ? tags.forDocument(documentId) : []
  },

  async readEmbed(relPath: string, fragment: string | null) {
    if (!store) return null
    const rel = normalizeRelPath(relPath)
    let raw: string
    try {
      raw = await store.readTextFile(rel)
    } catch {
      return null
    }
    const parsed = parseFrontmatter(raw)
    const title = asString(parsed.data['title']) ?? basenameOf(rel).replace(/\.md$/i, '')
    if (fragment === null || fragment === '') {
      return { title, text: parsed.body.trim() }
    }
    if (fragment.startsWith('^')) {
      const id = fragment.slice(1).toLowerCase()
      const block = parseBlocks(parsed.body).find((b) => b.type === 'block' && b.anchor === id)
      return { title, text: block?.text ?? '' }
    }
    return { title, text: extractHeadingSection(parsed.body, fragment) }
  },

  async runQuery(queryText: string) {
    if (!documents) return []
    return documents.query(parseQuery(queryText)).map(toDto)
  },

  async getGraph() {
    return graph ? graph.graph() : { nodes: [], edges: [] }
  },

  // --- Query tracker (CSV-backed literary agents, one file per manuscript) ---

  async listAgentManuscripts(): Promise<string[]> {
    if (!store) return []
    const slugs: string[] = []
    for (const entry of await store.list()) {
      if (entry.kind !== 'file') continue
      const slug = manuscriptSlugFromPath(normalizeRelPath(entry.relPath))
      if (slug !== null) slugs.push(slug)
    }
    return slugs.sort((a, b) => a.localeCompare(b))
  },

  async listAgents(slug: string): Promise<Agent[]> {
    if (!store) return []
    let raw: string
    try {
      raw = await store.readTextFile(agentsCsvPath(slug))
    } catch {
      return [] // no CSV yet for this manuscript
    }
    return parseCsvRecords(raw)
      .map(recordToAgent)
      .filter((agent) => agent.name !== '')
  },

  async saveAgents(slug: string, agents: Agent[]): Promise<void> {
    const open = requireOpen()
    const csv = recordsToCsv(AGENT_COLUMNS, agents.map(agentToRecord))
    await open.store.writeTextFile(agentsCsvPath(slug), csv)
  },

  async createAgentManuscript(slug: string): Promise<void> {
    const open = requireOpen()
    const path = agentsCsvPath(slug)
    if (await open.store.stat(path)) return
    await open.store.writeTextFile(path, recordsToCsv(AGENT_COLUMNS, []))
  },

  async aiStatus() {
    return { available: await aiClient.isAvailable() }
  },

  async summarizeDocument(relPath: string, model: string) {
    const open = requireOpen()
    return summarizeDocument({ store: open.store, db: open.db, ai: aiClient }, relPath, model)
  },

  async suggestEdits(relPath: string, model: string) {
    const open = requireOpen()
    return suggestEdits({ store: open.store, db: open.db, ai: aiClient }, relPath, model)
  },

  async checkConsistency(model: string) {
    const open = requireOpen()
    return checkConsistency({ store: open.store, db: open.db, ai: aiClient }, model)
  },

  async listMarkets() {
    return queryTracker ? queryTracker.markets() : []
  },

  async createMarket(input: CreateMarketInput) {
    if (!queryTracker) throw new Error('No archive is open')
    queryTracker.insertMarket({ id: crypto.randomUUID(), kind: input.kind, name: input.name })
  },

  async listSubmissions() {
    return queryTracker ? queryTracker.submissions() : []
  },

  async createSubmission(input: CreateSubmissionInput) {
    if (!queryTracker) throw new Error('No archive is open')
    const now = new Date().toISOString()
    queryTracker.insertSubmission({
      id: crypto.randomUUID(),
      title: input.title,
      marketId: input.marketId,
      documentId: input.documentId ?? null,
      manuscriptRev: input.manuscriptRev ?? null,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    })
  },

  async transitionSubmission(id: string, to: SubmissionStatus) {
    if (!queryTracker) throw new Error('No archive is open')
    const current = queryTracker.statusOf(id)
    if (current === null) throw new Error('Submission not found')
    if (!canTransition(current as SubmissionStatus, to)) {
      throw new Error(`Cannot move a submission from "${current}" to "${to}".`)
    }
    const now = new Date().toISOString()
    queryTracker.updateStatus(id, to, now)
    queryTracker.addEvent({
      id: crypto.randomUUID(),
      submissionId: id,
      kind: 'status_change',
      status: to,
      body: null,
      occurredOn: now,
    })
  },

  async listSubmissionEvents(submissionId: string) {
    return queryTracker ? queryTracker.eventsFor(submissionId) : []
  },

  async exportSubmissionsCsv() {
    const rows = queryTracker?.submissions() ?? []
    const header = [
      'Title',
      'Market',
      'Kind',
      'Status',
      'Submitted',
      'Deadline',
      'Manuscript version',
    ]
    const lines = [
      header,
      ...rows.map((r) => [
        r.title,
        r.marketName ?? '',
        r.marketKind ?? '',
        r.status,
        r.submittedOn ?? '',
        r.deadlineOn ?? '',
        r.manuscriptRev ?? '',
      ]),
    ]
    return lines.map((cols) => cols.map(csvCell).join(',')).join('\n')
  },

  async exportSubmissionsJson() {
    return JSON.stringify(queryTracker?.submissions() ?? [], null, 2)
  },

  async isOpen() {
    return store !== null
  },
}

Comlink.expose(api)
