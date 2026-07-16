import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import type { DocumentDTO } from '@/data/worker/types'
import { kindLabel } from './kind-label'

export function DocumentList({ documents }: { documents: readonly DocumentDTO[] }): JSX.Element {
  return (
    <div className="doc-list">
      {documents.map((doc) => (
        <Link className="doc" key={doc.id} to={`/doc/${doc.relPath}`}>
          <div
            className="doc__rail"
            data-tone={doc.workspaceId === 'ws-workspaces' ? 'counter' : 'accent'}
          />
          <div className="doc__body">
            <div className="doc__title">{doc.title ?? doc.relPath}</div>
            <div className="doc__meta">{doc.relPath}</div>
          </div>
          <span className="chip">{kindLabel(doc.kind)}</span>
        </Link>
      ))}
    </div>
  )
}
