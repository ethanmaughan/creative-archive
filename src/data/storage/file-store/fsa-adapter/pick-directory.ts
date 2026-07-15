/** User-gesture wrapper around showDirectoryPicker, kept separate so the adapter stays testable. */

interface DirectoryPickerOptions {
  mode?: 'read' | 'readwrite'
}

interface WindowWithPicker {
  showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>
}

export function isFileSystemAccessSupported(): boolean {
  return typeof (globalThis as unknown as WindowWithPicker).showDirectoryPicker === 'function'
}

/** Prompt the user to choose their archive folder (read/write). Must be called from a user gesture. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  const picker = (globalThis as unknown as WindowWithPicker).showDirectoryPicker
  if (!picker) {
    throw new Error(
      'This browser does not support the File System Access API. Use Chrome or Edge, or the desktop build.',
    )
  }
  return picker({ mode: 'readwrite' })
}
