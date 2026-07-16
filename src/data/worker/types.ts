/** The typed contract between the UI (main thread) and the data worker. */
import type { MediaType } from '@/domain/models/document'
import type { MarketKind } from '@/domain/models/market'
import type { SubmissionStatus } from '@/domain/models/submission'

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

export interface AiStatus {
  readonly available: boolean
}

/** Result of an AI run: the workspace file it wrote plus the generated text. */
export interface AiRunResultDTO {
  readonly workspacePath: string
  readonly content: string
}

/** Query Tracker DTOs. */
export interface MarketDTO {
  readonly id: string
  readonly kind: string
  readonly name: string
}

export interface SubmissionDTO {
  readonly id: string
  readonly title: string
  readonly status: string
  readonly marketId: string
  readonly marketName: string | null
  readonly marketKind: string | null
  readonly documentId: string | null
  readonly documentTitle: string | null
  readonly manuscriptRev: string | null
  readonly submittedOn: string | null
  readonly deadlineOn: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface SubmissionEventDTO {
  readonly id: string
  readonly kind: string
  readonly status: string | null
  readonly body: string | null
  readonly occurredOn: string
}

export interface CreateMarketInput {
  readonly kind: MarketKind
  readonly name: string
}

export interface CreateSubmissionInput {
  readonly title: string
  readonly marketId: string
  readonly documentId?: string
  readonly manuscriptRev?: string
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
  /** Whether local AI (Ollama) is reachable. */
  aiStatus(): Promise<AiStatus>
  /** Summarize a document; writes the summary into a writable workspace. */
  summarizeDocument(relPath: string, model: string): Promise<AiRunResultDTO>
  /** Check the story bible for inconsistencies; writes findings into a writable workspace. */
  checkConsistency(model: string): Promise<AiRunResultDTO>
  // Query Tracker
  listMarkets(): Promise<MarketDTO[]>
  createMarket(input: CreateMarketInput): Promise<void>
  listSubmissions(): Promise<SubmissionDTO[]>
  createSubmission(input: CreateSubmissionInput): Promise<void>
  /** Transition a submission's status (validated against the state machine). */
  transitionSubmission(id: string, to: SubmissionStatus): Promise<void>
  listSubmissionEvents(submissionId: string): Promise<SubmissionEventDTO[]>
  exportSubmissionsCsv(): Promise<string>
  exportSubmissionsJson(): Promise<string>
  isOpen(): Promise<boolean>
}
