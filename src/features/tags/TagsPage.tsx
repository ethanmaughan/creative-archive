import { useState, type JSX } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDocumentsByTag, useTags } from '@/data/worker/hooks'
import { Spinner } from '@/shared/ui/Spinner'
import { kindLabel } from '@/shared/ui/kind-label'

export function TagsPage(): JSX.Element {
  const [params] = useSearchParams()
  const { data, isLoading } = useTags()
  const [selected, setSelected] = useState<string | null>(params.get('tag'))
  const [filter, setFilter] = useState('')
  const { data: docs } = useDocumentsByTag(selected)

  const tags = data ?? []
  const needle = filter.trim().toLowerCase()
  const shown = needle === '' ? tags : tags.filter((tag) => tag.name.toLowerCase().includes(needle))

  return (
    <div className="content__inner">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tags</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Every <code>#tag</code> across your archive. Pick one to see what carries it.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="row">
          <Spinner /> Loading tags…
        </div>
      ) : tags.length === 0 ? (
        <p className="page-sub">
          No tags yet. Add <code>#tags</code> anywhere in a document and they’ll gather here.
        </p>
      ) : (
        <>
          <input
            className="tag-search"
            type="search"
            placeholder="Search tags…"
            aria-label="Search tags"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          {shown.length === 0 ? (
            <p className="page-sub">
              No tags match “{filter.trim()}”.
            </p>
          ) : (
            <div className="tag-cloud">
              {shown.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  className={`tag-chip${selected === tag.name ? ' is-active' : ''}`}
                  onClick={() => setSelected((current) => (current === tag.name ? null : tag.name))}
                >
                  #{tag.name}
                  <span className="tag-chip__count">{tag.count}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selected !== null ? (
        <section className="space-section">
          <h2 className="space-section__title">#{selected}</h2>
          {docs && docs.length > 0 ? (
            <div className="doc-list">
              {docs.map((doc) => (
                <Link className="doc" key={doc.id} to={`/doc/${doc.relPath}`}>
                  <div className="doc__rail" />
                  <div className="doc__body">
                    <div className="doc__title">{doc.title ?? doc.relPath}</div>
                    <div className="doc__meta">{doc.relPath}</div>
                  </div>
                  <span className="chip">{kindLabel(doc.kind)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="page-sub">Nothing carries this tag anymore.</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
