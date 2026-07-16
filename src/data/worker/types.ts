/** The typed contract between the UI (main thread) and the data worker. */
import type { MediaType } from '@/domain/models/document'

export interface DocumentDTO {
  readonly id: string
  readonly kind: string
  readonly relPath: string
  readonly title: string | null
  readonly workspaceId: string | null
}

/** A search hit with a body excerpt for display. */
export interface SearchResultDTO {
  readonly id: string
  readonly relPath: string
  readonly title: string | null
  readonly kind: string
  readonly snippet: string
}

export interface OpenResult {
  readonly docCount: number
  readonly inserted: number
  readonly updated: number
  readonly deleted: number
}

/** Full content of a single document (frontmatter body split out). */
export interface DocumentContent {
  readonly relPath: string
  readonly id: string
  readonly kind: string
  readonly title: string | null
  readonly body: string
}

/** Project-independent document kinds the user can create directly. */
export type CreatableKind = 'character' | 'location' | 'note' | 'research'

export interface CreateDocumentInput {
  readonly kind: CreatableKind
  readonly title: string
}

export interface SaveDocumentPatch {
  readonly body: string
  readonly title?: string
}

/** Typed library projection row (media metadata joined to its document). */
export interface LibraryItemDTO {
  readonly id: string
  readonly relPath: string
  readonly title: string | null
  readonly mediaType: string
  readonly creator: string | null
  readonly year: number | null
  readonly rating: number | null
}

export interface CreateLibraryItemInput {
  readonly mediaType: MediaType
  readonly title: string
  readonly creator?: string
  readonly year?: number
  readonly rating?: number
}

/** A single creative-extraction facet entry, joined to its source document. */
export interface FacetDTO {
  readonly id: string
  readonly relPath: string
  readonly docTitle: string | null
  readonly facet: string
  readonly content: string
}

/** A connection graph edge (document↔document), with both ends resolved for display. */
export interface ConnectionEdgeDTO {
  readonly id: string
  readonly relationship: string | null
  readonly sourceId: string
  readonly sourceTitle: string | null
  readonly sourceRelPath: string | null
  readonly targetId: string
  readonly targetTitle: string | null
  readonly targetRelPath: string | null
}

export interface CreateConnectionInput {
  readonly sourceId: string
  readonly targetId: string
  readonly relationship?: string
}

export interface DataApi {
  /** Open an archive folder: opens/creates the OPFS index, runs migrations, reconciles. */
  openArchive(handle: FileSystemDirectoryHandle): Promise<OpenResult>
  /** Re-run the reconciler against the currently open archive. */
  reconcile(): Promise<OpenResult>
  listDocuments(): Promise<DocumentDTO[]>
  /** Full-text search with body snippets, optionally filtered by document kind. */
  search(query: string, kind?: string): Promise<SearchResultDTO[]>
  /** Read a document's content (frontmatter + body), or null if missing. */
  readDocument(relPath: string): Promise<DocumentContent | null>
  /** Write a document's body (and optionally title) back to its file, then re-index it. */
  saveDocument(relPath: string, patch: SaveDocumentPatch): Promise<DocumentContent>
  /** Create a new document with a fresh UUID in the folder for its kind. */
  createDocument(input: CreateDocumentInput): Promise<DocumentContent>
  /** List typed library items (from the library_items projection). */
  listLibraryItems(): Promise<LibraryItemDTO[]>
  /** Create a new library item file with media metadata in its frontmatter. */
  createLibraryItem(input: CreateLibraryItemInput): Promise<DocumentContent>
  /** List creative-extraction facets, optionally filtered to one facet kind. */
  listFacets(facet?: string): Promise<FacetDTO[]>
  /** All connection edges. */
  listConnections(): Promise<ConnectionEdgeDTO[]>
  /** Connection edges touching a specific document (as source or target). */
  listDocumentConnections(documentId: string): Promise<ConnectionEdgeDTO[]>
  /** Create a document↔document connection (rejects self-references). */
  createConnection(input: CreateConnectionInput): Promise<void>
  deleteConnection(id: string): Promise<void>
  isOpen(): Promise<boolean>
}
