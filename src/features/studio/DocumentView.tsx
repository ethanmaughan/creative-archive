import { useEffect, useState, type JSX } from 'react'
import { useParams } from 'react-router-dom'
import { useDocument, useSaveDocument } from '@/data/worker/hooks'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { kindLabel } from '@/shared/ui/kind-label'
import { DocumentEditor } from './DocumentEditor'

export function DocumentView(): JSX.Element {
  const params = useParams()
  const relPath = params['*'] ?? ''
  const { data: doc, isLoading } = useDocument(relPath)
  const save = useSaveDocument()
  const [body, setBody] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (doc) {
      setBody(doc.body)
      setDirty(false)
    }
  }, [doc])

  if (isLoading) {
    return (
      <div className="content__inner">
        <div className="row">
          <Spinner /> Loading document…
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="content__inner">
        <p className="page-sub">Document not found.</p>
      </div>
    )
  }

  const saveLabel = save.isPending ? 'Saving…' : dirty ? 'Save' : 'Saved'

  return (
    <div className="content__inner">
      <div className="doc-head">
        <span className="chip">{kindLabel(doc.kind)}</span>
        <h1 className="page-title">{doc.title ?? relPath}</h1>
        <div className="doc-head__path">{relPath}</div>
      </div>

      <DocumentEditor
        key={relPath}
        value={doc.body}
        onChange={(markdown) => {
          setBody(markdown)
          setDirty(true)
        }}
      />

      <div className="editor-actions">
        <Button disabled={!dirty || save.isPending} onClick={() => save.mutate({ relPath, body })}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
