import type { JSX } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSpaces, useTree } from '@/data/worker/hooks'
import { Spinner } from '@/shared/ui/Spinner'
import { kindLabel } from '@/shared/ui/kind-label'
import { SPACE_TYPE_LABELS, isSpaceType, spacePathPrefix } from '@/domain/models/space'
import type { TreeEntryDTO } from '@/data/worker/types'
import { NewSpaceDocButton } from './NewSpaceDocButton'

function shortName(relPath: string, slug: string): string {
  return relPath.replace(spacePathPrefix(slug), '')
}

function FileLink({
  entry,
  slug,
  to,
}: {
  entry: TreeEntryDTO
  slug: string
  to: string
}): JSX.Element {
  const badge =
    entry.nodeKind === 'document'
      ? kindLabel(entry.docKind ?? 'document')
      : (entry.ext || 'file').toUpperCase()
  return (
    <Link className="doc" to={to}>
      <div className="doc__rail" />
      <div className="doc__body">
        <div className="doc__title">{entry.title ?? entry.name}</div>
        <div className="doc__meta">{shortName(entry.relPath, slug)}</div>
      </div>
      <span className="chip">{badge}</span>
    </Link>
  )
}

export function SpaceView(): JSX.Element {
  const slug = useParams()['slug'] ?? ''
  const { data: spaces, isLoading: spacesLoading } = useSpaces()
  const { data: tree, isLoading: treeLoading } = useTree()

  const space = spaces?.find((s) => s.slug === slug)
  const prefix = spacePathPrefix(slug)
  const marker = `${prefix}space.md`
  const inSpace = (tree ?? []).filter((e) => e.relPath.startsWith(prefix) && e.relPath !== marker)
  const documents = inSpace.filter((e) => e.nodeKind === 'document')
  const materials = inSpace.filter((e) => e.nodeKind === 'source')

  if (spacesLoading || treeLoading) {
    return (
      <div className="content__inner">
        <div className="row">
          <Spinner /> Opening space…
        </div>
      </div>
    )
  }

  if (!space) {
    return (
      <div className="content__inner">
        <p className="page-sub">Space not found.</p>
        <Link className="btn btn--ghost" to="/spaces">
          Back to spaces
        </Link>
      </div>
    )
  }

  const typeLabel = isSpaceType(space.spaceType)
    ? SPACE_TYPE_LABELS[space.spaceType]
    : space.spaceType

  return (
    <div className="content__inner">
      <div className="page-head">
        <div>
          <span className="chip">{typeLabel}</span>
          <h1 className="page-title" style={{ marginTop: '0.4rem' }}>
            {space.title ?? space.slug}
          </h1>
          <Link className="doc-head__path" to={`/search?space=${space.slug}`}>
            Search this space →
          </Link>
        </div>
        {isSpaceType(space.spaceType) ? (
          <NewSpaceDocButton spaceSlug={space.slug} spaceType={space.spaceType} />
        ) : null}
      </div>

      <section className="space-section">
        <h2 className="space-section__title">Documents</h2>
        {documents.length === 0 ? (
          <p className="page-sub">Nothing written here yet. Use “+ New” to start.</p>
        ) : (
          <div className="doc-list">
            {documents.map((entry) => (
              <FileLink
                key={entry.relPath}
                entry={entry}
                slug={slug}
                to={`/doc/${entry.relPath}`}
              />
            ))}
          </div>
        )}
      </section>

      {materials.length > 0 ? (
        <section className="space-section">
          <h2 className="space-section__title">Materials</h2>
          <div className="doc-list">
            {materials.map((entry) => (
              <FileLink
                key={entry.relPath}
                entry={entry}
                slug={slug}
                to={`/file/${entry.relPath}`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
