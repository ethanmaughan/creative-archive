import { useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import {
  useCreateConnection,
  useDeleteConnection,
  useDocumentConnections,
  useDocuments,
} from '@/data/worker/hooks'
import { SUGGESTED_RELATIONSHIPS } from '@/domain/models/connection'
import { Button } from '@/shared/ui/Button'

/** Author + browse the connections for one document (shown under the editor). */
export function ConnectionsPanel({ documentId }: { documentId: string }): JSX.Element {
  const { data: edges } = useDocumentConnections(documentId)
  const { data: docs } = useDocuments()
  const create = useCreateConnection()
  const remove = useDeleteConnection()
  const [relationship, setRelationship] = useState<string>(
    SUGGESTED_RELATIONSHIPS[0] ?? 'references',
  )
  const [targetId, setTargetId] = useState('')

  const others = (docs ?? []).filter((d) => d.id !== documentId)
  const list = edges ?? []

  const add = (): void => {
    if (targetId === '') return
    create.mutate(
      { sourceId: documentId, targetId, relationship },
      { onSuccess: () => setTargetId('') },
    )
  }

  return (
    <section className="connections">
      <h2 className="connections__title">Connections</h2>

      {list.length === 0 ? (
        <p className="page-sub">Not linked to anything yet.</p>
      ) : (
        <ul className="conn-list">
          {list.map((edge) => {
            const outgoing = edge.sourceId === documentId
            const otherTitle = outgoing ? edge.targetTitle : edge.sourceTitle
            const otherPath = outgoing ? edge.targetRelPath : edge.sourceRelPath
            return (
              <li className="conn" key={edge.id}>
                <span className="conn__rel">
                  {outgoing ? '→' : '←'} {edge.relationship ?? 'related'}
                </span>
                {otherPath ? (
                  <Link className="conn__doc" to={`/doc/${otherPath}`}>
                    {otherTitle ?? otherPath}
                  </Link>
                ) : (
                  <span className="conn__doc">{otherTitle ?? '(unknown)'}</span>
                )}
                <button
                  type="button"
                  className="conn__remove"
                  aria-label="Remove connection"
                  onClick={() => remove.mutate(edge.id)}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="conn-add">
        <select
          className="newdoc__select"
          value={relationship}
          onChange={(event) => setRelationship(event.target.value)}
          aria-label="Relationship"
        >
          {SUGGESTED_RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="newdoc__select"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          aria-label="Connect to"
        >
          <option value="">Connect to…</option>
          {others.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title ?? d.relPath}
            </option>
          ))}
        </select>
        <Button onClick={add} disabled={targetId === '' || create.isPending}>
          Connect
        </Button>
      </div>
    </section>
  )
}
