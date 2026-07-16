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
  const { open, supported } = useOpenArchive()
  const status = useSession((s) => s.status)
  const error = useSession((s) => s.error)

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
