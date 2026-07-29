import type { JSX } from 'react'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Spinner } from '@/shared/ui/Spinner'
import { useSession } from './store/session'
import { useOpenArchive } from './use-open-archive'

/** e2e hook: with `?e2e` in the URL, stand in OPFS for the picked folder so tests can drive
 *  the flow without the native directory picker (which can't be automated). */
async function resolveTestHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  if (!new URLSearchParams(window.location.search).has('e2e')) return undefined
  return navigator.storage.getDirectory()
}

export function OpenArchiveGate(): JSX.Element {
  const { open, reopenSaved, supported } = useOpenArchive()
  const status = useSession((s) => s.status)
  const error = useSession((s) => s.error)
  const savedArchiveName = useSession((s) => s.savedArchiveName)

  const handleOpen = (): void => {
    void resolveTestHandle().then((handle) => open(handle))
  }

  if (status === 'opening') {
    return (
      <div className="empty">
        <div className="row">
          <Spinner /> Opening and indexing your archive…
        </div>
      </div>
    )
  }

  // A folder was remembered from a previous session — offer to reconnect in one click.
  if (savedArchiveName !== null) {
    return (
      <EmptyState mark="❧" title="Welcome back">
        <p className="empty__body">
          Reopen <strong>{savedArchiveName}</strong> to pick up where you left off. Your browser may
          ask you to allow access again — that grant stays on this machine.
        </p>
        <Button onClick={() => void reopenSaved()} disabled={!supported}>
          Reopen {savedArchiveName}
        </Button>
        <Button variant="ghost" onClick={handleOpen} disabled={!supported}>
          Open a different folder…
        </Button>
        {status === 'error' && error ? (
          <p className="note">Couldn’t open the archive: {error}</p>
        ) : null}
      </EmptyState>
    )
  }

  return (
    <EmptyState mark="❧" title="Open your archive">
      <p className="empty__body">
        Choose the folder that holds your writing. Creative Archive reads it in place and builds a
        searchable index — your files never leave your machine.
      </p>
      <Button onClick={handleOpen} disabled={!supported}>
        Open archive folder
      </Button>
      {!supported ? (
        <p className="note">
          Folder access needs Chrome or Edge (the File System Access API). Firefox and Safari
          support arrives with the desktop build.
        </p>
      ) : null}
      {status === 'error' && error ? (
        <p className="note">Couldn’t open the archive: {error}</p>
      ) : null}
    </EmptyState>
  )
}
