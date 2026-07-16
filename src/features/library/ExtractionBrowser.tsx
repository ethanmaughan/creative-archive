import { useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { useFacets } from '@/data/worker/hooks'
import { Spinner } from '@/shared/ui/Spinner'
import { FACET_KINDS } from '@/domain/models/extraction'
import { facetLabel } from './facets'

export function ExtractionBrowser(): JSX.Element {
  const [facet, setFacet] = useState<string | null>(null)
  const { data, isLoading } = useFacets(facet)
  const entries = data ?? []

  return (
    <>
      <div className="filters">
        <button
          type="button"
          className={`filter${facet === null ? ' is-active' : ''}`}
          onClick={() => setFacet(null)}
        >
          All
        </button>
        {FACET_KINDS.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter${facet === f ? ' is-active' : ''}`}
            onClick={() => setFacet(f)}
          >
            {facetLabel(f)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="row">
          <Spinner /> Loading…
        </div>
      ) : entries.length === 0 ? (
        <p className="page-sub">
          No extraction notes yet. Add sections like “## Techniques” or “## Themes” to a library
          item’s page, and they’ll gather here across everything you’ve logged.
        </p>
      ) : (
        <div className="facet-list">
          {entries.map((entry) => (
            <Link className="facet" key={entry.id} to={`/doc/${entry.relPath}`}>
              <span className="chip">{facetLabel(entry.facet)}</span>
              <div className="facet__body">
                <div className="facet__doc">{entry.docTitle ?? entry.relPath}</div>
                <div className="facet__content">{entry.content}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
