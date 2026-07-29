import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { useSpaces } from '@/data/worker/hooks'
import { Spinner } from '@/shared/ui/Spinner'
import { SPACE_TYPE_LABELS, isSpaceType } from '@/domain/models/space'
import { NewSpaceButton } from './NewSpaceButton'

function typeLabel(spaceType: string): string {
  return isSpaceType(spaceType) ? SPACE_TYPE_LABELS[spaceType] : spaceType
}

export function SpacesPage(): JSX.Element {
  const { data, isLoading } = useSpaces()
  const spaces = data ?? []

  return (
    <div className="content__inner">
      <div className="page-head">
        <div>
          <h1 className="page-title">Spaces</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            A space for each project or class. Your Library and research stay shared across them.
          </p>
        </div>
        <NewSpaceButton />
      </div>

      {isLoading ? (
        <div className="row">
          <Spinner /> Loading spaces…
        </div>
      ) : spaces.length === 0 ? (
        <p className="page-sub">No spaces yet. Create one for a novel, a class, or a project.</p>
      ) : (
        <div className="doc-list">
          {spaces.map((space) => (
            <Link className="doc" key={space.id} to={`/space/${space.slug}`}>
              <div className="doc__rail" />
              <div className="doc__body">
                <div className="doc__title">{space.title ?? space.slug}</div>
                <div className="doc__meta">
                  {space.docCount} {space.docCount === 1 ? 'document' : 'documents'}
                </div>
              </div>
              <span className="chip">{typeLabel(space.spaceType)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
