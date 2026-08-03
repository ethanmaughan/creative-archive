import type { JSX } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCreateDocument, useTopicPage } from '@/data/worker/hooks'
import { ReferenceList } from '@/features/links/ReferenceList'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'

/**
 * A topic page for a bare `[[title]]` that has no note of its own — Logseq's "every bracket is
 * a page". Shows the topic name, everything that references it (with context), and a one-click
 * way to promote it into a real note. If a note *does* define the topic, we redirect to it.
 */
export function TopicView(): JSX.Element {
  const params = useParams()
  // React Router has already URL-decoded the param.
  const name = params['name'] ?? ''
  const { data, isLoading } = useTopicPage(name)
  const create = useCreateDocument()
  const navigate = useNavigate()

  if (isLoading || !data) {
    return (
      <div className="content__inner">
        <div className="row">
          <Spinner /> Loading topic…
        </div>
      </div>
    )
  }

  // A filed topic simply *is* its note — the note page carries its own references panel.
  if (data.definition) {
    return <Navigate to={`/doc/${data.definition.relPath}`} replace />
  }

  const createNote = (): void => {
    create.mutate(
      { kind: 'note', title: name },
      { onSuccess: (doc) => void navigate(`/doc/${doc.relPath}`) },
    )
  }

  const references = data.references

  return (
    <div className="content__inner">
      <div className="doc-head">
        <span className="chip">Topic</span>
        <h1 className="page-title">{name}</h1>
        <div className="page-sub">No note defines this topic yet.</div>
      </div>

      <div className="topic__actions">
        <Button onClick={createNote} disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create this note'}
        </Button>
      </div>

      <section className="references">
        <div className="references__title">Linked references · {references.length}</div>
        {references.length > 0 ? (
          <ReferenceList references={references} />
        ) : (
          <p className="page-sub">Nothing links here yet.</p>
        )}
      </section>
    </div>
  )
}
