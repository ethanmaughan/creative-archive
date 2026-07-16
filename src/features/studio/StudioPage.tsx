import type { JSX } from 'react'
import { useDocuments } from '@/data/worker/hooks'
import { ConsistencyButton } from '@/features/ai/ConsistencyButton'
import { DocumentList } from '@/shared/ui/DocumentList'
import { Spinner } from '@/shared/ui/Spinner'
import { NewDocumentButton } from './NewDocumentButton'

export function StudioPage(): JSX.Element {
  const { data, isLoading } = useDocuments()

  return (
    <div className="content__inner">
      <div className="page-head">
        <div>
          <h1 className="page-title">Studio</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Everything indexed from your archive.
          </p>
        </div>
        <NewDocumentButton />
      </div>

      <ConsistencyButton />

      {isLoading ? (
        <div className="row">
          <Spinner /> Loading documents…
        </div>
      ) : !data || data.length === 0 ? (
        <p className="page-sub">
          No documents yet. Create one, or add Markdown files to your archive folder.
        </p>
      ) : (
        <DocumentList documents={data} />
      )}
    </div>
  )
}
