/** Desktop (Tauri) detection + the native folder picker. */
import { open } from '@tauri-apps/plugin-dialog'

/** True when running inside the Tauri desktop shell (vs. a browser). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** Open the native folder chooser; returns the absolute path, or null if cancelled. */
export async function pickDirectoryNative(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Choose your archive folder',
  })
  return typeof selected === 'string' ? selected : null
}

export function basename(path: string): string {
  return path.replace(/\/+$/, '').split('/').pop() ?? path
}
