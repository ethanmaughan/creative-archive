import type { JSX } from 'react'
import { useReferences } from '@/data/worker/hooks'
import { ReferenceList } from './ReferenceList'

/** "Linked references" for a document — every note that points here via a `[[wikilink]]`,
 *  shown with the line where the link appears. */
export function ReferencesPanel({ documentId }: { documentId: string }): JSX.Element | null {
  const { data } = useReferences(documentId)
  const references = data ?? []
  if (references.length === 0) return null

  return (
    <section className="references">
      <div className="references__title">Linked references · {references.length}</div>
      <ReferenceList references={references} />
    </section>
  )
}
