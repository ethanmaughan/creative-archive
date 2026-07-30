import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { useBacklinks } from '@/data/worker/hooks'

/** "Linked references" — documents that point here via a `[[wikilink]]`. */
export function BacklinksPanel({ documentId }: { documentId: string }): JSX.Element | null {
  const { data } = useBacklinks(documentId)
  const backlinks = data ?? []
  if (backlinks.length === 0) return null

  return (
    <section className="connections">
      <div className="connections__title">Linked references · {backlinks.length}</div>
      <div className="conn-list">
        {backlinks.map((backlink) => (
          <Link key={backlink.id} className="conn" to={`/doc/${backlink.relPath}`}>
            <span className="conn__doc">{backlink.title ?? backlink.relPath}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
