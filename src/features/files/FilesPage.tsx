import { useMemo, useState, type JSX } from 'react'
import { Link } from 'react-router-dom'
import { useTree } from '@/data/worker/hooks'
import { Spinner } from '@/shared/ui/Spinner'
import { kindLabel } from '@/shared/ui/kind-label'
import type { TreeEntryDTO } from '@/data/worker/types'
import { buildTree, type TreeNode } from './build-tree'

const CATEGORY_LABELS: Record<string, string> = {
  text: 'Text',
  docx: 'Word',
  pdf: 'PDF',
  image: 'Image',
  other: 'File',
}

/** Documents open in the editor; sources open in the read-only viewer. */
function linkFor(entry: TreeEntryDTO): string {
  return entry.nodeKind === 'document' ? `/doc/${entry.relPath}` : `/file/${entry.relPath}`
}

function badgeFor(entry: TreeEntryDTO): string {
  if (entry.nodeKind === 'document') return kindLabel(entry.docKind ?? 'document')
  return CATEGORY_LABELS[entry.category ?? 'other'] ?? (entry.ext || 'File').toUpperCase()
}

function FileRow({ entry }: { entry: TreeEntryDTO }): JSX.Element {
  const dim = entry.nodeKind === 'source' && entry.hasText === false
  return (
    <Link className="tree__file" to={linkFor(entry)}>
      <span className="tree__glyph" aria-hidden="true">
        {entry.nodeKind === 'document' ? '✎' : '⎙'}
      </span>
      <span className="tree__name">{entry.name}</span>
      <span className={`chip${dim ? ' chip--muted' : ''}`}>{badgeFor(entry)}</span>
    </Link>
  )
}

function DirRow({ node }: { node: Extract<TreeNode, { type: 'dir' }> }): JSX.Element {
  const [open, setOpen] = useState(true)
  return (
    <div className="tree__dir">
      <button className="tree__dir-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="tree__glyph" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span className="tree__name">{node.name}</span>
      </button>
      {open ? (
        <div className="tree__children">
          {node.children.map((child) => (
            <TreeRow key={child.type === 'dir' ? child.path : child.entry.relPath} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TreeRow({ node }: { node: TreeNode }): JSX.Element {
  return node.type === 'dir' ? <DirRow node={node} /> : <FileRow entry={node.entry} />
}

export function FilesPage(): JSX.Element {
  const { data, isLoading } = useTree()
  const tree = useMemo(() => buildTree(data ?? []), [data])

  return (
    <div className="content__inner">
      <div className="page-head">
        <div>
          <h1 className="page-title">Files</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Everything in your archive folder — documents you can edit, and uploads you can read.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="row">
          <Spinner /> Reading your folder…
        </div>
      ) : tree.length === 0 ? (
        <p className="page-sub">
          This folder is empty. Add files to it, or create a document from the Studio.
        </p>
      ) : (
        <div className="tree">
          {tree.map((node) => (
            <TreeRow key={node.type === 'dir' ? node.path : node.entry.relPath} node={node} />
          ))}
        </div>
      )}
    </div>
  )
}
