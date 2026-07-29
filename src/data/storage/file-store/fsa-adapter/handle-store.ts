/**
 * Remembers the chosen archive folder across sessions — entirely locally. The
 * FileSystemDirectoryHandle is structured-cloneable, so we stash it in IndexedDB (no server,
 * no account). On a later visit we re-check permission and reconnect; the browser may require
 * one click to re-grant read/write.
 */

const DB_NAME = 'creative-archive'
const STORE = 'handles'
const KEY = 'archive-dir'

function idbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveArchiveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  if (!idbAvailable()) return
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(handle, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function loadArchiveHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!idbAvailable()) return null
  const db = await openDb()
  try {
    return await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      request.onsuccess = () =>
        resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function clearArchiveHandle(): Promise<void> {
  if (!idbAvailable()) return
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

// queryPermission/requestPermission are Chromium extensions not yet in the DOM lib types.
interface Permissionable {
  queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
}

/** True if we already hold read/write permission (no user gesture needed). */
export async function hasReadWritePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const p = handle as unknown as Permissionable
  if (!p.queryPermission) return true // e.g. OPFS handles are always accessible
  return (await p.queryPermission({ mode: 'readwrite' })) === 'granted'
}

/** Ask for read/write permission. Must be called from a user gesture. */
export async function requestReadWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const p = handle as unknown as Permissionable
  if (!p.requestPermission) return true
  return (await p.requestPermission({ mode: 'readwrite' })) === 'granted'
}
