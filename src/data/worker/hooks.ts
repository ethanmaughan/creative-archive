import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useSession } from '@/app/store/session'
import { getDataClient } from './data-client'
import type { DocumentDTO } from './types'

export function useDocuments(): UseQueryResult<DocumentDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => getDataClient().listDocuments(),
    enabled: ready,
  })
}

export function useSearch(query: string): UseQueryResult<DocumentDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => getDataClient().search(trimmed),
    enabled: ready && trimmed.length > 0,
  })
}
