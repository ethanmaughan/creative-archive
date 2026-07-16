/** Session state: which archive is open and its status. In-memory for now (re-open each
 *  session); persisting the directory handle via IndexedDB is a later nicety. */
import { create } from 'zustand'

export type ArchiveStatus = 'idle' | 'opening' | 'ready' | 'error'

const AI_MODEL_KEY = 'ca-ai-model'
const DEFAULT_AI_MODEL = 'llama3.2'

function initialAiModel(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_AI_MODEL
  return localStorage.getItem(AI_MODEL_KEY) ?? DEFAULT_AI_MODEL
}

interface SessionState {
  status: ArchiveStatus
  archiveName: string | null
  docCount: number
  error: string | null
  aiModel: string
  reset: () => void
  setOpening: () => void
  setReady: (archiveName: string, docCount: number) => void
  setError: (message: string) => void
  setDocCount: (docCount: number) => void
  setAiModel: (model: string) => void
}

export const useSession = create<SessionState>((set) => ({
  status: 'idle',
  archiveName: null,
  docCount: 0,
  error: null,
  aiModel: initialAiModel(),
  reset: () => set({ status: 'idle', error: null }),
  setOpening: () => set({ status: 'opening', error: null }),
  setReady: (archiveName, docCount) => set({ status: 'ready', archiveName, docCount, error: null }),
  setError: (message) => set({ status: 'error', error: message }),
  setDocCount: (docCount) => set({ docCount }),
  setAiModel: (model) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(AI_MODEL_KEY, model)
    set({ aiModel: model })
  },
}))
