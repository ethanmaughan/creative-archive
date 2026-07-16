export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'ca-theme'

/** Apply a persisted theme choice (if any) to the document. Call once at startup. */
export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved
  }
}

export function getTheme(): Theme {
  const current = document.documentElement.dataset.theme
  if (current === 'light' || current === 'dark') return current
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
