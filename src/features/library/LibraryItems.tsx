import { useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { useLibraryItems } from '@/data/worker/hooks'
import { Spinner } from '@/shared/ui/Spinner'
import { mediaLabel, ratingStars } from './media'

export function LibraryItems(): JSX.Element {
  const { data, isLoading } = useLibraryItems()
  const [filter, setFilter] = useState('all')

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
      ) : null}

      <div className="doc-list">
        {shown.map((item) => {
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
                </div>
              </div>
              <span className="chip">{mediaLabel(item.mediaType)}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
