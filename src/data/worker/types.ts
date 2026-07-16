/** The typed contract between the UI (main thread) and the data worker. */

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

export interface DataApi {
  /** Open an archive folder: opens/creates the OPFS index, runs migrations, reconciles. */
  openArchive(handle: FileSystemDirectoryHandle): Promise<OpenResult>
  /** Re-run the reconciler against the currently open archive. */
  reconcile(): Promise<OpenResult>
  listDocuments(): Promise<DocumentDTO[]>
  search(query: string): Promise<DocumentDTO[]>
  isOpen(): Promise<boolean>
}
