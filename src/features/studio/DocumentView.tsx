import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDocument, useDocuments, useDocumentTags, useSaveDocument } from '@/data/worker/hooks'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { kindLabel } from '@/shared/ui/kind-label'
import { ConnectionsPanel } from '@/features/connections/ConnectionsPanel'
import { BacklinksPanel } from '@/features/links/BacklinksPanel'
import { SummarizePanel } from '@/features/ai/SummarizePanel'
import { DocumentEditor } from './DocumentEditor'

const AUTOSAVE_DELAY_MS = 1200

export function DocumentView(): JSX.Element {
  const params = useParams()
  const relPath = params['*'] ?? ''
  const { data: doc, isLoading } = useDocument(relPath)
  const { data: allDocs } = useDocuments()
  const navigate = useNavigate()
  const save = useSaveDocument()
  const saveMutate = save.mutate

  // Resolve `[[wikilink]]` targets → a doc path (by title or filename), for click-to-navigate.
  const resolverRef = useRef<Map<string, string>>(new Map())
  const resolver = new Map<string, string>()
  for (const d of allDocs ?? []) {
    const base = d.relPath.split('/').pop()?.replace(/\.md$/i, '').toLowerCase()
    if (base) resolver.set(base, d.relPath)
    if (d.title) resolver.set(d.title.toLowerCase(), d.relPath)
  }
  resolverRef.current = resolver
  const onWikilinkClick = useCallback(
    (target: string) => {
      const rel = resolverRef.current.get(target.trim().toLowerCase())
      if (rel !== undefined) void navigate(`/doc/${rel}`)
    },
    [navigate],
  )
  const onTagClick = useCallback(
    (tag: string) => void navigate(`/tags?tag=${encodeURIComponent(tag)}`),
    [navigate],
  )

  const { data: docTags } = useDocumentTags(doc?.id ?? null)

  const [body, setBody] = useState('')
  const [dirty, setDirty] = useState(false)
  const bodyRef = useRef(body)
  bodyRef.current = body

  useEffect(() => {
    if (doc) {
      setBody(doc.body)
      setDirty(false)
    }
  }, [doc])

  // Autosave: after a short idle, write the body back to the file.
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => {
      setDirty(false)
      saveMutate({ relPath, body: bodyRef.current })
    }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [body, dirty, relPath, saveMutate])

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

  const status = save.isPending ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'

  return (
    <div className="content__inner">
      <div className="doc-head">
        <span className="chip">{kindLabel(doc.kind)}</span>
        <h1 className="page-title">{doc.title ?? relPath}</h1>
        <div className="doc-head__path">{relPath}</div>
        {docTags && docTags.length > 0 ? (
          <div className="doc-tags">
            {docTags.map((tag) => (
              <button key={tag} type="button" className="tag-chip" onClick={() => onTagClick(tag)}>
                #{tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <DocumentEditor
        key={relPath}
        value={doc.body}
        onChange={(markdown) => {
          setBody(markdown)
          setDirty(true)
        }}
        onWikilinkClick={onWikilinkClick}
        onTagClick={onTagClick}
      />

      <div className="editor-actions">
        <span className={`save-status${dirty || save.isPending ? ' is-dirty' : ''}`}>{status}</span>
        <Button
          variant="ghost"
          disabled={!dirty || save.isPending}
          onClick={() => {
            setDirty(false)
            saveMutate({ relPath, body })
          }}
        >
          Save now
        </Button>
      </div>

      {doc.id !== '' ? <BacklinksPanel documentId={doc.id} /> : null}
      {doc.id !== '' ? <ConnectionsPanel documentId={doc.id} /> : null}
      <SummarizePanel relPath={relPath} />
    </div>
  )
}
