import { useState, type JSX } from 'react'
import { getTheme, toggleTheme } from './theme'

export function ThemeToggle(): JSX.Element {
  const [theme, setThemeState] = useState(getTheme)
  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={() => setThemeState(toggleTheme())}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
