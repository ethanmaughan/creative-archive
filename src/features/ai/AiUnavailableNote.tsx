import type { JSX } from 'react'

export function AiUnavailableNote(): JSX.Element {
  return (
    <p className="note">
      Local AI isn’t reachable. Start Ollama and allow this origin — e.g.{' '}
      <code>OLLAMA_ORIGINS=&apos;*&apos; ollama serve</code> — then reload. AI is optional;
      everything else works without it.
    </p>
  )
}
