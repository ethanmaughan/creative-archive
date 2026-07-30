/**
 * FileStore over the native filesystem via Tauri's fs plugin — the desktop adapter behind the
 * same `FileStore` port the web (File System Access) adapter implements (ADR-0002).
 *
 * It runs on the **main thread** (Tauri's JS APIs aren't available inside a Web Worker), and is
 * handed to the data worker as a Comlink proxy — which is exactly why `list()` returns an array
 * rather than a stream. Paths are POSIX-relative to the chosen archive root.
 */
import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  stat,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import { type FileEntry, type FileStat, type FileStore, normalizeRelPath } from '../file-store'

export class NativeFileStore implements FileStore {
  /** @param root absolute path to the archive folder (from the native dialog). */
  constructor(private readonly root: string) {}

  private abs(relPath: string): string {
    const rel = normalizeRelPath(relPath)
    return rel === '' ? this.root : `${this.root}/${rel}`
  }

  private async walk(relDir: string, out: FileEntry[]): Promise<void> {
    const entries = await readDir(this.abs(relDir))
    for (const entry of entries) {
      const rel = relDir === '' ? entry.name : `${relDir}/${entry.name}`
      if (entry.isDirectory) {
        out.push({ relPath: rel, kind: 'directory' })
        await this.walk(rel, out)
      } else if (entry.isFile) {
        out.push({ relPath: rel, kind: 'file' })
      }
    }
  }

  async list(): Promise<FileEntry[]> {
    const entries: FileEntry[] = []
    await this.walk('', entries)
    return entries
  }

  async readTextFile(relPath: string): Promise<string> {
    return readTextFile(this.abs(relPath))
  }

  async readBinaryFile(relPath: string): Promise<Uint8Array> {
    return readFile(this.abs(relPath))
  }

  async writeTextFile(relPath: string, contents: string): Promise<void> {
    const rel = normalizeRelPath(relPath)
    const parent = rel.split('/').slice(0, -1).join('/')
    if (parent !== '' && !(await exists(this.abs(parent)))) {
      await mkdir(this.abs(parent), { recursive: true })
    }
    await writeTextFile(this.abs(relPath), contents)
  }

  async deleteFile(relPath: string): Promise<void> {
    await remove(this.abs(relPath))
  }

  async stat(relPath: string): Promise<FileStat | null> {
    try {
      const info = await stat(this.abs(relPath))
      return { mtime: info.mtime ? info.mtime.getTime() : 0, size: info.size }
    } catch {
      return null
    }
  }
}
