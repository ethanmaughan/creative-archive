/** Session state: which archive is open and its status. In-memory for now (re-open each
 *  session); persisting the directory handle via IndexedDB is a later nicety. */
import { create } from 'zustand'

export type ArchiveStatus = 'idle' | 'opening' | 'ready' | 'error'

interface SessionState {
  status: ArchiveStatus
  archiveName: string | null
  docCount: number
  error: string | null
  reset: () => void
  setOpening: () => void
  setReady: (archiveName: string, docCount: number) => void
  setError: (message: string) => void
  setDocCount: (docCount: number) => void
}

export const useSession = create<SessionState>((set) => ({
  status: 'idle',
  archiveName: null,
  docCount: 0,
  error: null,
  reset: () => set({ status: 'idle', error: null }),
  setOpening: () => set({ status: 'opening', error: null }),
  setReady: (archiveName, docCount) => set({ status: 'ready', archiveName, docCount, error: null }),
  setError: (message) => set({ status: 'error', error: message }),
  setDocCount: (docCount) => set({ docCount }),
}))
