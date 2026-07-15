/**
 * Directory change detection. The File System Access API has no built-in watcher, so we
 * prefer the emerging `FileSystemObserver` (Chromium) and fall back to re-checking when
 * the window regains focus. Either way the app responds by re-running the reconciler.
 */

export type ChangeListener = () => void

export interface DirectoryWatcher {
  stop(): void
}

interface FileSystemObserverLike {
  observe(handle: FileSystemHandle, options?: { recursive?: boolean }): Promise<void>
  disconnect(): void
}

interface FileSystemObserverCtor {
  new (callback: () => void): FileSystemObserverLike
}

function getObserverCtor(): FileSystemObserverCtor | undefined {
  return (globalThis as unknown as { FileSystemObserver?: FileSystemObserverCtor })
    .FileSystemObserver
}

export function supportsFileSystemObserver(): boolean {
  return getObserverCtor() !== undefined
}

export function watchDirectory(
  handle: FileSystemDirectoryHandle,
  onChange: ChangeListener,
): DirectoryWatcher {
  const Observer = getObserverCtor()
  if (Observer) {
    const observer = new Observer(() => {
      onChange()
    })
    void observer.observe(handle, { recursive: true })
    return { stop: () => observer.disconnect() }
  }

  // Fallback: re-check on window focus (no continuous polling).
  if (typeof window === 'undefined') {
    return { stop: () => undefined }
  }
  const handler = (): void => onChange()
  window.addEventListener('focus', handler)
  return { stop: () => window.removeEventListener('focus', handler) }
}
