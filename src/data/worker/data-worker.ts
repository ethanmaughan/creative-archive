/**
 * The data worker — owns the FileStore, the OPFS SQLite index, and the reconciler, all off
 * the main thread (OPFS SAHPool requires a Worker context anyway). The UI talks to it via
 * Comlink as if these were local async calls.
 */
import * as Comlink from 'comlink'
import { FsaFileStore } from '@/data/storage/file-store/fsa-adapter/fsa-file-store'
import { openOpfs } from '@/data/storage/sqlite-index/client'
import { applyMigrations, type Sqlite } from '@/data/storage/sqlite-index/migrator'
import { MIGRATIONS } from '@/data/storage/sqlite-index/migrations'
import { reconcile } from '@/data/storage/sqlite-index/reconciler'
import { DocumentRepository, type DocumentRecord } from '@/data/repositories/document-repository'
import { toFtsQuery } from './fts-query'
import type { DataApi, DocumentDTO, OpenResult } from './types'

let db: Sqlite | null = null
let store: FsaFileStore | null = null
let documents: DocumentRepository | null = null

function toDto(record: DocumentRecord): DocumentDTO {
  return {
    id: record.id,
    kind: record.kind,
    relPath: record.relPath,
    title: record.title,
    workspaceId: record.workspaceId,
  }
}

async function ensureDb(): Promise<{ db: Sqlite; documents: DocumentRepository }> {
  if (!db) {
    db = await openOpfs()
    applyMigrations(db, MIGRATIONS)
    documents = new DocumentRepository(db)
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
    if (!db || !store || !documents) throw new Error('No archive is open')
    const result = await reconcile(store, db)
    return { docCount: documents.all().length, ...result } satisfies OpenResult
  },

  async listDocuments() {
    return documents ? documents.all().map(toDto) : []
  },

  async search(query) {
    if (!documents) return []
    const fts = toFtsQuery(query)
    if (fts === '') return []
    return documents.search(fts).map(toDto)
  },

  async isOpen() {
    return store !== null
  },
}

Comlink.expose(api)
