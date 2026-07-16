/**
 * The data worker — owns the FileStore, the OPFS SQLite index, and the reconciler, all off
 * the main thread (OPFS SAHPool requires a Worker context anyway). The UI talks to it via
 * Comlink as if these were local async calls.
 */
import * as Comlink from 'comlink'
import { FsaFileStore } from '@/data/storage/file-store/fsa-adapter/fsa-file-store'
import { normalizeRelPath } from '@/data/storage/file-store/file-store'
import {
  ensureId,
  parseFrontmatter,
  serializeFrontmatter,
} from '@/data/storage/file-store/frontmatter'
import { openOpfs } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile, reindexOne } from '@/data/storage/sqlite-index/reconciler'
import { DocumentRepository, type DocumentRecord } from '@/data/repositories/document-repository'
import { LibraryRepository } from '@/data/repositories/library-repository'
import { ExtractionRepository } from '@/data/repositories/extraction-repository'
import { ConnectionRepository } from '@/data/repositories/connection-repository'
import { classifyKind } from '@/domain/models/workspace'
import { validateConnection } from '@/domain/services/connection-rules'
import { OllamaClient } from '@/data/ai/ollama-client'
import { checkConsistency, summarizeDocument } from '@/data/ai/ai-service'
import type { AiClient } from '@/data/ai/ai-client'
import { QueryTrackerRepository } from '@/data/repositories/query-tracker-repository'
import { canTransition } from '@/domain/services/submission-workflow'
import type { SubmissionStatus } from '@/domain/models/submission'
import { slugify } from '@/shared/slug'
import { buildSnippet, queryTerms, toFtsQuery } from './fts-query'
import type {
  CreatableKind,
  CreateDocumentInput,
  CreateLibraryItemInput,
  CreateConnectionInput,
  CreateMarketInput,
  CreateSubmissionInput,
  DataApi,
  DocumentContent,
  DocumentDTO,
  OpenResult,
  SaveDocumentPatch,
  SearchResultDTO,
} from './types'

let db: Sqlite | null = null
let store: FsaFileStore | null = null
let documents: DocumentRepository | null = null
let library: LibraryRepository | null = null
let extraction: ExtractionRepository | null = null
let connections: ConnectionRepository | null = null
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

function requireOpen(): { db: Sqlite; store: FsaFileStore } {
  if (!db || !store) throw new Error('No archive is open')
  return { db, store }
}

async function ensureDb(): Promise<{ db: Sqlite; documents: DocumentRepository }> {
  if (!db) {
    db = await openOpfs()
    applyMigrations(db, MIGRATIONS)
    documents = new DocumentRepository(db)
    library = new LibraryRepository(db)
    extraction = new ExtractionRepository(db)
    connections = new ConnectionRepository(db)
    queryTracker = new QueryTrackerRepository(db)
  }
  return { db, documents: documents! }
}

const api: DataApi = {
  async openArchive(handle) {
    const ready = await ensureDb()
    store = new FsaFileStore(handle)
    const result = await reconcile(store, ready.db)
    return { docCount: ready.documents.all().length, ...result } satisfies OpenResult
  },

  async reconcile() {
    const open = requireOpen()
    const result = await reconcile(open.store, open.db)
    return { docCount: documents?.all().length ?? 0, ...result } satisfies OpenResult
  },

  async listDocuments() {
    return documents ? documents.all().map(toDto) : []
  },

  async search(query: string, kind?: string) {
    if (!documents || !store) return []
    const fts = toFtsQuery(query)
    if (fts === '') return []
    const hits = documents.search(fts, { limit: 20, ...(kind !== undefined ? { kind } : {}) })
    const terms = queryTerms(query)
    const results: SearchResultDTO[] = []
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
    return results
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

  async listLibraryItems() {
    return library ? library.all() : []
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
    const content = serializeFrontmatter(data, '')
    await open.store.writeTextFile(relPath, content)
    await reindexOne(open.store, open.db, relPath)
    return toContent(relPath, data, '')
  },

  async listFacets(facet?: string) {
    return extraction ? extraction.all(facet) : []
  },

  async listConnections() {
    return connections ? connections.all() : []
  },

  async listDocumentConnections(documentId: string) {
    return connections ? connections.forDocument(documentId) : []
  },

  async createConnection(input: CreateConnectionInput) {
    if (!connections) throw new Error('No archive is open')
    const validation = validateConnection({
      source: { type: 'document', id: input.sourceId },
      target: { type: 'document', id: input.targetId },
      ...(input.relationship !== undefined ? { relationship: input.relationship } : {}),
    })
    if (!validation.valid) {
      throw new Error(validation.issues.map((issue) => issue.message).join('; '))
    }
    connections.insert({
      id: crypto.randomUUID(),
      sourceId: input.sourceId,
      targetId: input.targetId,
      relationship: input.relationship ?? null,
      createdAt: new Date().toISOString(),
    })
  },

  async deleteConnection(id: string) {
    connections?.remove(id)
  },

  async aiStatus() {
    return { available: await aiClient.isAvailable() }
  },

  async summarizeDocument(relPath: string, model: string) {
    const open = requireOpen()
    return summarizeDocument({ store: open.store, db: open.db, ai: aiClient }, relPath, model)
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
