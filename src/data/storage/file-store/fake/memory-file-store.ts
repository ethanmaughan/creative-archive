/** In-memory FileStore for tests. Deterministic mtimes via an internal clock. */
import { type FileEntry, type FileStat, type FileStore, normalizeRelPath } from '../file-store'

interface MemoryFile {
  contents: string
  mtime: number
}

export class MemoryFileStore implements FileStore {
  private readonly files = new Map<string, MemoryFile>()
  private clock = 1

  constructor(initial: Record<string, string> = {}) {
    for (const [path, contents] of Object.entries(initial)) {
      this.files.set(normalizeRelPath(path), { contents, mtime: this.clock++ })
    }
  }

  async *list(): AsyncIterable<FileEntry> {
    for (const relPath of this.files.keys()) {
      yield { relPath, kind: 'file' }
    }
  }

  async readTextFile(relPath: string): Promise<string> {
    const file = this.files.get(normalizeRelPath(relPath))
    if (!file) throw new Error(`ENOENT: ${relPath}`)
    return file.contents
  }

  async writeTextFile(relPath: string, contents: string): Promise<void> {
    this.files.set(normalizeRelPath(relPath), { contents, mtime: this.clock++ })
  }

  async deleteFile(relPath: string): Promise<void> {
    this.files.delete(normalizeRelPath(relPath))
  }

  async stat(relPath: string): Promise<FileStat | null> {
    const file = this.files.get(normalizeRelPath(relPath))
    return file ? { mtime: file.mtime, size: file.contents.length } : null
  }

  // --- test helpers (not part of FileStore) ---
  peek(relPath: string): string | undefined {
    return this.files.get(normalizeRelPath(relPath))?.contents
  }

  moveSync(from: string, to: string): void {
    const file = this.files.get(normalizeRelPath(from))
    if (!file) return
    this.files.delete(normalizeRelPath(from))
    this.files.set(normalizeRelPath(to), file)
  }
}
