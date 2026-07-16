import type { JSX } from 'react'
import { Link } from 'react-router-dom'
import { useAllConnections } from '@/data/worker/hooks'
import { Spinner } from '@/shared/ui/Spinner'

export function ConnectionsPage(): JSX.Element {
  const { data, isLoading } = useAllConnections()
  const edges = data ?? []

  return (
    <div className="content__inner">
      <h1 className="page-title">Connections</h1>
      <p className="page-sub">
        Every link across your archive. Add connections from any document’s page.
      </p>

      {isLoading ? (
        <div className="row">
          <Spinner /> Loading connections…
        </div>
      ) : edges.length === 0 ? (
        <p className="page-sub">No connections yet. Open a document and link it to another.</p>
      ) : (
        <ul className="conn-list conn-list--global">
          {edges.map((edge) => (
            <li className="conn" key={edge.id}>
              {edge.sourceRelPath ? (
                <Link className="conn__doc" to={`/doc/${edge.sourceRelPath}`}>
                  {edge.sourceTitle ?? edge.sourceRelPath}
                </Link>
              ) : (
                <span className="conn__doc">{edge.sourceTitle ?? '(unknown)'}</span>
              )}
              <span className="conn__rel">→ {edge.relationship ?? 'related'} →</span>
              {edge.targetRelPath ? (
                <Link className="conn__doc" to={`/doc/${edge.targetRelPath}`}>
                  {edge.targetTitle ?? edge.targetRelPath}
                </Link>
              ) : (
                <span className="conn__doc">{edge.targetTitle ?? '(unknown)'}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
