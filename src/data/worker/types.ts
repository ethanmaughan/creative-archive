/** The typed contract between the UI (main thread) and the data worker. */
import type { FileStore } from '@/data/storage/file-store/file-store'
import type { MediaType } from '@/domain/models/document'
import type { SpaceDocKind, SpaceType } from '@/domain/models/space'
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

/** One entry in the archive file tree — an authored document or a read-only source file. */
export interface TreeEntryDTO {
  readonly relPath: string
  readonly name: string
  readonly nodeKind: 'document' | 'source'
  /** Human title (authored documents); falls back to the filename in the UI. */
  readonly title?: string | null
  /** Document kind, for `nodeKind: 'document'`. */
  readonly docKind?: string
  /** Source category (text | docx | pdf | image | other), for `nodeKind: 'source'`. */
  readonly category?: string
  readonly ext?: string
  /** Whether searchable text was extracted (sources only). */
  readonly hasText?: boolean
}

/** Read-only view of a foreign source file — extracted text plus metadata. */
export interface SourceContentDTO {
  readonly relPath: string
  readonly name: string
  readonly ext: string
  readonly category: string
  readonly size: number
  readonly hasText: boolean
  readonly text: string
}

/** Project-independent document kinds the user can create directly. */
export type CreatableKind = 'character' | 'location' | 'note' | 'research'

export interface CreateDocumentInput {
  readonly kind: CreatableKind
  readonly title: string
}

/** A user-created space (projected from its `space.md`). */
export interface SpaceDTO {
  readonly id: string
  readonly slug: string
  readonly relPath: string
  readonly title: string | null
  readonly spaceType: string
  readonly docCount: number
}

export interface CreateSpaceInput {
  readonly title: string
  readonly spaceType: SpaceType
}

export interface CreateSpaceDocInput {
  readonly spaceSlug: string
  readonly kind: SpaceDocKind
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
  /** User-entered date consumed (YYYY-MM-DD), or null. */
  readonly consumedOn: string | null
  /** App-stamped ISO datetime the entry was logged, or null. */
  readonly logged: string | null
}

/** How to order the library list. Rows missing the chosen date always sort last. */
export interface LibrarySort {
  readonly by: 'consumed' | 'logged'
  readonly dir: 'asc' | 'desc'
}

export interface CreateLibraryItemInput {
  readonly mediaType: MediaType
  readonly title: string
  readonly creator?: string
  readonly year?: number
  readonly rating?: number
  /** Date the media was consumed (YYYY-MM-DD). */
  readonly consumedOn?: string
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

/** A document that links to another via a resolved `[[wikilink]]` (a backlink). */
export interface BacklinkDTO {
  readonly id: string
  readonly title: string | null
  readonly relPath: string
}

/** A tag with the number of documents carrying it. */
export interface TagCountDTO {
  readonly name: string
  readonly count: number
}

/** Resolved content for an `![[embed]]` — a whole doc, a block, or a heading section. */
export interface EmbedContentDTO {
  readonly title: string
  readonly text: string
}

/** The knowledge graph for the graph view. */
export interface GraphDTO {
  readonly nodes: { id: string; relPath: string; title: string | null; kind: string }[]
  readonly edges: { source: string; target: string }[]
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
  /** Desktop: open an archive from a Comlink-proxied native FileStore (Tauri fs). */
  openArchiveNative(store: FileStore): Promise<OpenResult>
  /** Re-run the reconciler against the currently open archive. */
  reconcile(): Promise<OpenResult>
  listDocuments(): Promise<DocumentDTO[]>
  /** Every indexed file (authored documents + read-only sources) for the file browser. */
  listTree(): Promise<TreeEntryDTO[]>
  /** Read a source file's extracted text + metadata, or null if it isn't a source. */
  readSource(relPath: string): Promise<SourceContentDTO | null>
  /** Raw bytes of a source file (for image preview), or null if missing. */
  readSourceBytes(relPath: string): Promise<Uint8Array | null>
  /** Full-text search with body snippets, optionally filtered by document kind. Pass the
   *  sentinel kind `'source'` to search only uploaded files; omit to search everything. Pass a
   *  space slug as `scope` to narrow results to that space. */
  search(query: string, kind?: string, scope?: string): Promise<SearchResultDTO[]>
  /** List user-created spaces. */
  listSpaces(): Promise<SpaceDTO[]>
  /** Create a new space (writes `spaces/<slug>/space.md`). */
  createSpace(input: CreateSpaceInput): Promise<SpaceDTO>
  /** Create an authored document inside a space, in the subfolder for its kind. */
  createSpaceDocument(input: CreateSpaceDocInput): Promise<DocumentContent>
  /** Read a document's content (frontmatter + body), or null if missing. */
  readDocument(relPath: string): Promise<DocumentContent | null>
  /** Write a document's body (and optionally title) back to its file, then re-index it. */
  saveDocument(relPath: string, patch: SaveDocumentPatch): Promise<DocumentContent>
  /** Create a new document with a fresh UUID in the folder for its kind. */
  createDocument(input: CreateDocumentInput): Promise<DocumentContent>
  /** List typed library items (from the library_items projection), optionally sorted by date. */
  listLibraryItems(sort?: LibrarySort): Promise<LibraryItemDTO[]>
  /** Create a new library item file with media metadata in its frontmatter. */
  createLibraryItem(input: CreateLibraryItemInput): Promise<DocumentContent>
  /** List creative-extraction facets, optionally filtered to one facet kind. */
  listFacets(facet?: string): Promise<FacetDTO[]>
  /** All connection edges. */
  listConnections(): Promise<ConnectionEdgeDTO[]>
  /** Connection edges touching a specific document (as source or target). */
  listDocumentConnections(documentId: string): Promise<ConnectionEdgeDTO[]>
  /** Documents that link to this one via a resolved `[[wikilink]]` (backlinks). */
  listBacklinks(documentId: string): Promise<BacklinkDTO[]>
  /** All tags applied to documents, with counts. */
  listTags(): Promise<TagCountDTO[]>
  /** Documents carrying a given tag. */
  listDocumentsByTag(name: string): Promise<DocumentDTO[]>
  /** Tag names applied to a single document. */
  listDocumentTags(documentId: string): Promise<string[]>
  /** Resolve an `![[embed]]` target to its content (whole doc / block / heading section). */
  readEmbed(relPath: string, fragment: string | null): Promise<EmbedContentDTO | null>
  /** Run an inline ` ```query ` block's declarative query, returning matching documents. */
  runQuery(queryText: string): Promise<DocumentDTO[]>
  /** The document graph (nodes + deduped wikilink/connection edges) for the graph view. */
  getGraph(): Promise<GraphDTO>
  /** Create a document↔document connection (rejects self-references). */
  createConnection(input: CreateConnectionInput): Promise<void>
  deleteConnection(id: string): Promise<void>
  /** Whether local AI (Ollama) is reachable. */
  aiStatus(): Promise<AiStatus>
  /** Summarize a document; writes the summary into a writable workspace. */
  summarizeDocument(relPath: string, model: string): Promise<AiRunResultDTO>
  /** Advisory edit suggestions; writes them into a writable workspace (never the doc). */
  suggestEdits(relPath: string, model: string): Promise<AiRunResultDTO>
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
