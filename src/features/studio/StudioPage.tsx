import type { JSX } from 'react'
import { useDocuments } from '@/data/worker/hooks'
import { DocumentList } from '@/shared/ui/DocumentList'
import { Spinner } from '@/shared/ui/Spinner'

export function StudioPage(): JSX.Element {
  const { data, isLoading } = useDocuments()

  return (
    <div className="content__inner">
      <h1 className="page-title">Studio</h1>
      <p className="page-sub">Everything indexed from your archive.</p>

      {isLoading ? (
        <div className="row">
          <Spinner /> Loading documents…
        </div>
      ) : !data || data.length === 0 ? (
        <p className="page-sub">
          No documents yet. Add Markdown files to your archive folder, then re-index.
        </p>
      ) : (
        <DocumentList documents={data} />
      )}
    </div>
  )
}
