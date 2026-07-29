import { useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { useLibraryItems } from '@/data/worker/hooks'
import type { LibrarySort } from '@/data/worker/types'
import { Spinner } from '@/shared/ui/Spinner'
import { formatConsumed, formatLogged, mediaLabel, ratingStars } from './media'

export function LibraryItems(): JSX.Element {
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState<LibrarySort['by']>('consumed')
  const [dir, setDir] = useState<LibrarySort['dir']>('desc')
  const { data, isLoading } = useLibraryItems({ by: sortBy, dir })

  const items = data ?? []
  const types = Array.from(new Set(items.map((i) => i.mediaType)))
  const shown = filter === 'all' ? items : items.filter((i) => i.mediaType === filter)

  if (isLoading) {
    return (
      <div className="row">
        <Spinner /> Loading library…
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <p className="page-sub">Nothing logged yet. Log a book, film, or anything you learn from.</p>
    )
  }

  return (
    <>
      <div className="lib-controls">
        {types.length > 1 ? (
          <div className="filters">
            <button
              type="button"
              className={`filter${filter === 'all' ? ' is-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className={`filter${filter === t ? ' is-active' : ''}`}
                onClick={() => setFilter(t)}
              >
                {mediaLabel(t)}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <div className="lib-sort">
          <select
            className="newdoc__select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as LibrarySort['by'])}
            aria-label="Sort by"
          >
            <option value="consumed">Date consumed</option>
            <option value="logged">Date logged</option>
          </select>
          <select
            className="newdoc__select"
            value={dir}
            onChange={(event) => setDir(event.target.value as LibrarySort['dir'])}
            aria-label="Order"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      <div className="doc-list">
        {shown.map((item) => {
          const consumed = formatConsumed(item.consumedOn)
          const meta = [item.creator, item.year?.toString()].filter(Boolean).join(' · ')
          return (
            <Link className="doc" key={item.id} to={`/doc/${item.relPath}`}>
              <div className="doc__rail" />
              <div className="doc__body">
                <div className="doc__title">{item.title ?? item.relPath}</div>
                <div className="doc__meta">
                  {meta || item.relPath}
                  {item.rating ? (
                    <span className="stars"> · {ratingStars(item.rating)}</span>
                  ) : null}
                  {consumed ? <span> · Consumed {consumed}</span> : null}
                </div>
                {item.logged ? (
                  <div className="doc__logged">Logged {formatLogged(item.logged)}</div>
                ) : null}
              </div>
              <span className="chip">{mediaLabel(item.mediaType)}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
