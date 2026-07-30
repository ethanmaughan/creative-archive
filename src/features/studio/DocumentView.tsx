import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  useDocument,
  useDocuments,
  useDocumentTags,
  useSaveDocument,
  useTags,
} from '@/data/worker/hooks'
import { getDataClient } from '@/data/worker/data-client'
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
  const [searchParams] = useSearchParams()
  const anchor = searchParams.get('anchor')
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
      const hash = target.indexOf('#')
      const page = (hash < 0 ? target : target.slice(0, hash)).trim()
      const fragment = hash < 0 ? '' : target.slice(hash + 1).trim()
      const suffix = fragment !== '' ? `?anchor=${encodeURIComponent(fragment)}` : ''
      // A fragment with no page (`[[#^id]]`) points within the current document.
      if (page === '') {
        if (fragment !== '') void navigate(`/doc/${relPath}${suffix}`)
        return
      }
      const rel = resolverRef.current.get(page.toLowerCase())
      if (rel !== undefined) void navigate(`/doc/${rel}${suffix}`)
    },
    [navigate, relPath],
  )
  const onTagClick = useCallback(
    (tag: string) => void navigate(`/tags?tag=${encodeURIComponent(tag)}`),
    [navigate],
  )
  const resolveEmbed = useCallback(
    async (target: string, fragment: string | null) => {
      const rel = target === '' ? relPath : resolverRef.current.get(target.toLowerCase())
      if (rel === undefined) return null
      return getDataClient().readEmbed(rel, fragment)
    },
    [relPath],
  )
  const runQuery = useCallback((text: string) => getDataClient().runQuery(text), [])
  const navigateDoc = useCallback((rel: string) => void navigate(`/doc/${rel}`), [navigate])

  // Autocomplete sources: `[[` over document titles, `#` over existing tags.
  const { data: allTags } = useTags()
  const docsRef = useRef(allDocs)
  docsRef.current = allDocs
  const tagsRef = useRef(allTags)
  tagsRef.current = allTags
  const queryDocs = useCallback((query: string) => {
    const q = query.trim().toLowerCase()
    return (docsRef.current ?? [])
      .filter((d): d is typeof d & { title: string } => Boolean(d.title?.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((d) => ({ label: d.title, insertText: `[[${d.title}]]` }))
  }, [])
  const queryTags = useCallback((query: string) => {
    const q = query.trim().toLowerCase()
    return (tagsRef.current ?? [])
      .filter((t) => t.name.includes(q))
      .slice(0, 8)
      .map((t) => ({ label: `#${t.name}`, insertText: `#${t.name} ` }))
  }, [])

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
        docTitle={doc.title ?? relPath}
        anchor={anchor}
        onResolveEmbed={resolveEmbed}
        onRunQuery={runQuery}
        onNavigateDoc={navigateDoc}
        onQueryDocs={queryDocs}
        onQueryTags={queryTags}
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
