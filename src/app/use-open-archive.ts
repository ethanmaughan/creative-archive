import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  isFileSystemAccessSupported,
  pickDirectory,
} from '@/data/storage/file-store/fsa-adapter/pick-directory'
import { getDataClient } from '@/data/worker/data-client'
import { useSession } from './store/session'

/** Drives the "open archive" flow: picks a folder (or uses an injected handle for tests),
 *  hands it to the data worker to reconcile, and updates session + query state. */
export function useOpenArchive(): {
  open: (handleOverride?: FileSystemDirectoryHandle) => Promise<void>
  supported: boolean
} {
  const queryClient = useQueryClient()
  const setOpening = useSession((s) => s.setOpening)
  const setReady = useSession((s) => s.setReady)
  const setError = useSession((s) => s.setError)
  const reset = useSession((s) => s.reset)

  const open = useCallback(
    async (handleOverride?: FileSystemDirectoryHandle) => {
      setOpening()
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
      try {
        const result = await getDataClient().openArchive(handle)
        setReady(handle.name, result.docCount)
        await queryClient.invalidateQueries()
      } catch (error) {
        setError((error as Error).message)
      }
    },
    [queryClient, setOpening, setReady, setError, reset],
  )

  return { open, supported: isFileSystemAccessSupported() }
}
