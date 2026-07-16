import { useState, type JSX } from 'react'
import { useSearch } from '@/data/worker/hooks'
import { DocumentList } from '@/shared/ui/DocumentList'
import { Spinner } from '@/shared/ui/Spinner'

export function SearchPage(): JSX.Element {
  const [query, setQuery] = useState('')
  const { data, isFetching } = useSearch(query)
  const trimmed = query.trim()

  return (
    <div className="content__inner">
      <h1 className="page-title">Search</h1>
      <p className="page-sub">Full-text search across every indexed document.</p>

      <div className="search search--lg" style={{ marginBottom: '1.2rem' }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the archive…"
          aria-label="Search"
          autoFocus
        />
        {isFetching ? <Spinner /> : null}
      </div>

      {trimmed.length > 0 && !isFetching && data && data.length === 0 ? (
        <p className="page-sub">No matches for “{trimmed}”.</p>
      ) : null}

      {data && data.length > 0 ? <DocumentList documents={data} /> : null}
    </div>
  )
}
