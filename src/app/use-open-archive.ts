import { useCallback } from 'react'
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
import { getDataClient } from '@/data/worker/data-client'
import { useSession } from './store/session'

/** Drives the "open archive" flow: picks a folder (or uses an injected handle for tests),
 *  hands it to the data worker to reconcile, remembers it for next time, and updates state. */
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

  const open = useCallback(
    async (handleOverride?: FileSystemDirectoryHandle) => {
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
    [openHandle, reset, setError],
  )

  // On startup: if we remembered a folder and still hold permission, reconnect silently.
  const restore = useCallback(async () => {
    const handle = await loadArchiveHandle()
    if (!handle) return
    setSavedArchiveName(handle.name)
    if (await hasReadWritePermission(handle)) {
      await openHandle(handle)
    }
  }, [openHandle, setSavedArchiveName])

  // From a user gesture: re-grant permission to the remembered folder and reconnect.
  const reopenSaved = useCallback(async () => {
    const handle = await loadArchiveHandle()
    if (!handle) return
    if (await requestReadWritePermission(handle)) {
      await openHandle(handle)
    } else {
      setError('Permission to that folder was denied. Open it again to continue.')
    }
  }, [openHandle, setError])

  return { open, restore, reopenSaved, supported: isFileSystemAccessSupported() }
}
