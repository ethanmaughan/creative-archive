/** The typed contract between the UI (main thread) and the data worker. */
import type { MediaType } from '@/domain/models/document'

export interface DocumentDTO {
  readonly id: string
  readonly kind: string
  readonly relPath: string
  readonly title: string | null
  readonly workspaceId: string | null
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

export interface DataApi {
  /** Open an archive folder: opens/creates the OPFS index, runs migrations, reconciles. */
  openArchive(handle: FileSystemDirectoryHandle): Promise<OpenResult>
  /** Re-run the reconciler against the currently open archive. */
  reconcile(): Promise<OpenResult>
  listDocuments(): Promise<DocumentDTO[]>
  search(query: string): Promise<DocumentDTO[]>
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
  isOpen(): Promise<boolean>
}
