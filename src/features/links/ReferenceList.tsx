import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import type { ReferenceDTO } from '@/data/worker/types'
import { kindLabel } from '@/shared/ui/kind-label'

// Split a context line into plain text and `[[wikilink]]` spans so the link stands out.
const WIKILINK_SPAN = /(\[\[[^[\]]+\]\])/g

function ContextLine({ text }: { text: string }): JSX.Element {
  const parts = text.split(WIKILINK_SPAN).filter((p) => p !== '')
  return (
    <p className="ref__ctx">
      {parts.map((part, i) =>
        part.startsWith('[[') && part.endsWith(']]') ? (
          <mark key={`${i}-${part}`} className="ref__ctx-link">
            {part}
          </mark>
        ) : (
          <span key={`${i}-${part}`}>{part}</span>
        ),
      )}
    </p>
  )
}

/** Logseq-style "linked references": each source note, alphabetical, with the line(s) that
 *  mention the target as context. Ordering is set by the worker (title-alphabetical). */
export function ReferenceList({ references }: { references: ReferenceDTO[] }): JSX.Element {
  return (
    <ul className="ref-list">
      {references.map((ref) => (
        <li className="ref" key={ref.sourceId}>
          <Link className="ref__src" to={`/doc/${ref.relPath}`}>
            <span className="ref__src-title">{ref.title ?? ref.relPath}</span>
            <span className="chip chip--sm">{kindLabel(ref.kind)}</span>
          </Link>
          {ref.contexts.length > 0 ? (
            <div className="ref__contexts">
              {ref.contexts.map((c, i) => (
                <ContextLine key={`${i}-${c}`} text={c} />
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
