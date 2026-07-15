import type { JSX } from 'react'

/**
 * Phase 1 app shell. Intentionally minimal — routing (React Router), state
 * (Zustand), and server-state (TanStack Query) are introduced in Phase 5
 * (UI framework), once the storage and domain layers exist beneath them.
 */
export function App(): JSX.Element {
  return (
    <main>
      <h1>Creative Archive</h1>
      <p>A local-first workspace for writers. AI retrieves; it never authors.</p>
      <p className="phase">Phase 1 — project initialization.</p>
    </main>
  )
}
