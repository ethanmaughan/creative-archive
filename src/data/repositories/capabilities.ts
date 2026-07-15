/**
 * Capability boundaries for the AI subsystem — layers 1 & 2 of the protected-workspace
 * guarantee (ADR-0001 §1). Layer 3 (the SQLite trigger) lives in the 0001 migration.
 */
import { type FileStore, normalizeRelPath } from '../storage/file-store/file-store'
import type { DocumentRepository } from './document-repository'

/**
 * Layer 2 — the AI only ever sees a READ-ONLY view of the document index. There is no
 * write/delete method on this type, so a canon-write fails to compile.
 */
export type ReadonlyDocumentRepository = Pick<
  DocumentRepository,
  'getById' | 'getByPath' | 'all' | 'search'
>

const WRITABLE_PREFIX = 'workspaces/'

/**
 * Layer 1 — wrap a FileStore so the AI can only create/modify files inside writable
 * workspaces. Reads are unrestricted; canonical content is never writable through this
 * facade, regardless of what the AI is prompted to do.
 */
export function createAiFileStore(base: FileStore): FileStore {
  const assertWritable = (relPath: string): void => {
    if (!normalizeRelPath(relPath).startsWith(WRITABLE_PREFIX)) {
      throw new Error(`AI writes are confined to "${WRITABLE_PREFIX}" (attempted: ${relPath})`)
    }
  }
  return {
    list: () => base.list(),
    readTextFile: (relPath) => base.readTextFile(relPath),
    stat: (relPath) => base.stat(relPath),
    writeTextFile: async (relPath, contents) => {
      assertWritable(relPath)
      await base.writeTextFile(relPath, contents)
    },
    deleteFile: async (relPath) => {
      assertWritable(relPath)
      await base.deleteFile(relPath)
    },
  }
}
