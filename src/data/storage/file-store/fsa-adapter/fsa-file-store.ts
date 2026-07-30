/**
 * FileStore over the File System Access API. It operates on a `FileSystemDirectoryHandle`
 * injected by the caller — production supplies one from `pickDirectory()`, tests supply
 * an OPFS handle from `navigator.storage.getDirectory()` (same interface), which is what
 * makes this adapter testable without the un-automatable native picker.
 */
import { type FileEntry, type FileStat, type FileStore, normalizeRelPath } from '../file-store'

async function* walk(dir: FileSystemDirectoryHandle, prefix: string): AsyncIterable<FileEntry> {
  for await (const [name, handle] of dir.entries()) {
    const relPath = prefix ? `${prefix}/${name}` : name
    if (handle.kind === 'directory') {
      yield { relPath, kind: 'directory' }
      yield* walk(handle as FileSystemDirectoryHandle, relPath)
    } else {
      yield { relPath, kind: 'file' }
    }
  }
}

export class FsaFileStore implements FileStore {
  constructor(private readonly root: FileSystemDirectoryHandle) {}

  async list(): Promise<FileEntry[]> {
    const entries: FileEntry[] = []
    for await (const entry of walk(this.root, '')) entries.push(entry)
    return entries
  }

  async readTextFile(relPath: string): Promise<string> {
    const handle = await this.resolveFile(relPath, false)
    const file = await handle.getFile()
    return file.text()
  }

  async readBinaryFile(relPath: string): Promise<Uint8Array> {
    const handle = await this.resolveFile(relPath, false)
    const file = await handle.getFile()
    return new Uint8Array(await file.arrayBuffer())
  }

  async writeTextFile(relPath: string, contents: string): Promise<void> {
    const handle = await this.resolveFile(relPath, true)
    const writable = await handle.createWritable()
    try {
      await writable.write(contents)
    } finally {
      await writable.close()
    }
  }

  async deleteFile(relPath: string): Promise<void> {
    const segments = normalizeRelPath(relPath).split('/')
    const name = segments.pop()
    if (!name) return
    const dir = await this.resolveDir(segments, false)
    if (dir) await dir.removeEntry(name)
  }

  async stat(relPath: string): Promise<FileStat | null> {
    try {
      const handle = await this.resolveFile(relPath, false)
      const file = await handle.getFile()
      return { mtime: file.lastModified, size: file.size }
    } catch {
      return null
    }
  }

  private async resolveDir(
    segments: readonly string[],
    create: boolean,
  ): Promise<FileSystemDirectoryHandle | null> {
    let dir = this.root
    for (const segment of segments) {
      if (segment === '') continue
      try {
        dir = await dir.getDirectoryHandle(segment, { create })
      } catch (error) {
        if (create) throw error
        return null
      }
    }
    return dir
  }

  private async resolveFile(relPath: string, create: boolean): Promise<FileSystemFileHandle> {
    const segments = normalizeRelPath(relPath).split('/')
    const name = segments.pop()
    if (!name) throw new Error(`Invalid file path: ${relPath}`)
    const dir = await this.resolveDir(segments, create)
    if (!dir) throw new Error(`ENOENT: ${relPath}`)
    return dir.getFileHandle(name, { create })
  }
}
