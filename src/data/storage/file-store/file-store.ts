/**
 * The filesystem port (ADR-0002). Everything above this interface is adapter-agnostic;
 * the File System Access adapter ships in v1, a Tauri adapter drops in later. Paths are
 * POSIX-style and relative to the archive root (no leading slash).
 */

export interface FileEntry {
  readonly relPath: string
  readonly kind: 'file' | 'directory'
}

export interface FileStat {
  /** Last-modified time, epoch milliseconds. */
  readonly mtime: number
  /** Size in bytes (best-effort; adapters may report text length). */
  readonly size: number
}

export interface FileStore {
  /** Recursively yield every entry under the archive root. */
  list(): AsyncIterable<FileEntry>
  readTextFile(relPath: string): Promise<string>
  /** Read raw bytes — used to extract text from binary formats (docx/pdf) and preview images. */
  readBinaryFile(relPath: string): Promise<Uint8Array>
  writeTextFile(relPath: string, contents: string): Promise<void>
  deleteFile(relPath: string): Promise<void>
  stat(relPath: string): Promise<FileStat | null>
}

/** Normalize to a POSIX-relative path (drop leading `./` or `/`, collapse `\`). */
export function normalizeRelPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.?\//, '')
}
