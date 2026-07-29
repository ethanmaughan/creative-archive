import { useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { useSearch } from '@/data/worker/hooks'
import { queryTerms } from '@/data/worker/fts-query'
import { DOCUMENT_KINDS } from '@/domain/models/document'
import { Spinner } from '@/shared/ui/Spinner'
import { kindLabel } from '@/shared/ui/kind-label'

function Highlighted({ text, terms }: { text: string; terms: readonly string[] }): JSX.Element {
  if (text === '' || terms.length === 0) return <>{text}</>
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // Split on a single capture group → matched terms land at odd indices.
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
      )}
    </>
  )
}

export function SearchPage(): JSX.Element {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<string | null>(null)
  const { data, isFetching } = useSearch(query, kind)

  const trimmed = query.trim()
  const terms = queryTerms(query)
  const results = data ?? []

  return (
    <div className="content__inner">
      <h1 className="page-title">Search</h1>
      <p className="page-sub">Full-text search across your documents and uploaded files.</p>

      <div className="search-bar">
        <div className="search search--lg">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the archive…"
            aria-label="Search"
            autoFocus
          />
          {isFetching ? <Spinner /> : null}
        </div>
        <select
          className="newdoc__select"
          value={kind ?? ''}
          onChange={(event) => setKind(event.target.value === '' ? null : event.target.value)}
          aria-label="Filter by kind"
        >
          <option value="">All kinds</option>
          {DOCUMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {kindLabel(k)}
            </option>
          ))}
          <option value="source">Uploaded files</option>
        </select>
      </div>

      {trimmed !== '' && !isFetching && results.length === 0 ? (
        <p className="page-sub">No matches for “{trimmed}”.</p>
      ) : null}

      <div className="result-list">
        {results.map((result) => (
          <Link
            className="result"
            key={result.id}
            to={result.kind === 'source' ? `/file/${result.relPath}` : `/doc/${result.relPath}`}
          >
            <div className="result__head">
              <span className="result__title">{result.title ?? result.relPath}</span>
              <span className="chip">
                {result.kind === 'source' ? 'Uploaded file' : kindLabel(result.kind)}
              </span>
            </div>
            <div className="result__path">{result.relPath}</div>
            {result.snippet !== '' ? (
              <div className="result__snippet">
                <Highlighted text={result.snippet} terms={terms} />
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  )
}
