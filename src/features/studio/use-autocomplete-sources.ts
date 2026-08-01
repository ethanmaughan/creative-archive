import { useCallback, useRef } from 'react'
import { useDocuments, useTags } from '@/data/worker/hooks'
import type { SuggestionItem } from './suggestion-popup'

/** Autocomplete item sources for the editor: `[[` over document titles, `#` over existing tags.
 *  Reads current data via refs so the returned callbacks stay stable. */
export function useAutocompleteSources(): {
  queryDocs: (query: string) => SuggestionItem[]
  queryTags: (query: string) => SuggestionItem[]
} {
  const { data: docs } = useDocuments()
  const { data: tags } = useTags()
  const docsRef = useRef(docs)
  docsRef.current = docs
  const tagsRef = useRef(tags)
  tagsRef.current = tags

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

  return { queryDocs, queryTags }
}
