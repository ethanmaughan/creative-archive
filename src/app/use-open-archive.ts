import { useCallback } from 'react'
import * as Comlink from 'comlink'
import { useQueryClient } from '@tanstack/react-query'
import {
  isFileSystemAccessSupported,
  pickDirectory,
} from '@/data/storage/file-store/fsa-adapter/pick-directory'
import {
  hasReadWritePermission,
  loadArchiveHandle,
  requestReadWritePermission,
  saveArchiveHandle,
} from '@/data/storage/file-store/fsa-adapter/handle-store'
import { NativeFileStore } from '@/data/storage/file-store/tauri-adapter/native-file-store'
import {
  basename,
  isTauri,
  pickDirectoryNative,
} from '@/data/storage/file-store/tauri-adapter/platform'
import { getDataClient } from '@/data/worker/data-client'
import { useSession } from './store/session'

// On desktop the archive is a plain path (no accounts, no server), remembered in localStorage.
const NATIVE_PATH_KEY = 'creative-archive:native-path'
// Kept alive for the app's lifetime so the worker's Comlink proxy to it stays valid.
let activeNativeStore: NativeFileStore | null = null

/** Drives the "open archive" flow across both shells: the browser's File System Access API and
 *  the Tauri desktop's native filesystem. Reconciles via the worker and updates session state. */
export function useOpenArchive(): {
  open: (handleOverride?: FileSystemDirectoryHandle) => Promise<void>
  restore: () => Promise<void>
  reopenSaved: () => Promise<void>
  supported: boolean
} {
  const queryClient = useQueryClient()
  const setOpening = useSession((s) => s.setOpening)
  const setReady = useSession((s) => s.setReady)
  const setError = useSession((s) => s.setError)
  const reset = useSession((s) => s.reset)
  const setSavedArchiveName = useSession((s) => s.setSavedArchiveName)

  const openHandle = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      setOpening()
      try {
        const result = await getDataClient().openArchive(handle)
        await saveArchiveHandle(handle) // remember it for next time (local only)
        setSavedArchiveName(handle.name)
        setReady(handle.name, result.docCount)
        await queryClient.invalidateQueries()
      } catch (error) {
        setError((error as Error).message)
      }
    },
    [queryClient, setOpening, setReady, setError, setSavedArchiveName],
  )

  // Desktop: open a native folder path. The FileStore lives here on the main thread (Tauri APIs)
  // and is handed to the worker as a Comlink proxy.
  const openNativePath = useCallback(
    async (path: string) => {
      setOpening()
      try {
        activeNativeStore = new NativeFileStore(path)
        const result = await getDataClient().openArchiveNative(Comlink.proxy(activeNativeStore))
        localStorage.setItem(NATIVE_PATH_KEY, path)
        const name = basename(path)
        setSavedArchiveName(name)
        setReady(name, result.docCount)
        await queryClient.invalidateQueries()
      } catch (error) {
        setError((error as Error).message)
      }
    },
    [queryClient, setOpening, setReady, setError, setSavedArchiveName],
  )

  const open = useCallback(
    async (handleOverride?: FileSystemDirectoryHandle) => {
      if (isTauri()) {
        const path = await pickDirectoryNative()
        if (path === null) {
          reset()
          return
        }
        await openNativePath(path)
        return
      }
      let handle: FileSystemDirectoryHandle
      try {
        handle = handleOverride ?? (await pickDirectory())
      } catch (error) {
        // The user dismissed the picker — return to idle rather than showing an error.
        if (error instanceof DOMException && error.name === 'AbortError') {
          reset()
          return
        }
        setError((error as Error).message)
        return
      }
      await openHandle(handle)
    },
    [openHandle, openNativePath, reset, setError],
  )

  // On startup: reconnect to the remembered folder. Desktop reconnects silently from the saved
  // path; web reconnects if read/write permission is still granted.
  const restore = useCallback(async () => {
    if (isTauri()) {
      const path = localStorage.getItem(NATIVE_PATH_KEY)
      if (path === null) return
      setSavedArchiveName(basename(path))
      await openNativePath(path)
      return
    }
    const handle = await loadArchiveHandle()
    if (!handle) return
    setSavedArchiveName(handle.name)
    if (await hasReadWritePermission(handle)) {
      await openHandle(handle)
    }
  }, [openHandle, openNativePath, setSavedArchiveName])

  // Web only: re-grant permission to the remembered folder from a user gesture.
  const reopenSaved = useCallback(async () => {
    if (isTauri()) {
      const path = localStorage.getItem(NATIVE_PATH_KEY)
      if (path !== null) await openNativePath(path)
      return
    }
    const handle = await loadArchiveHandle()
    if (!handle) return
    if (await requestReadWritePermission(handle)) {
      await openHandle(handle)
    } else {
      setError('Permission to that folder was denied. Open it again to continue.')
    }
  }, [openNativePath, openHandle, setError])

  return {
    open,
    restore,
    reopenSaved,
    supported: isTauri() || isFileSystemAccessSupported(),
  }
}
