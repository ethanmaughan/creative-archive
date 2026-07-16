import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useSession } from '@/app/store/session'
import { getDataClient } from './data-client'
import type {
  ConnectionEdgeDTO,
  CreateConnectionInput,
  CreateDocumentInput,
  CreateLibraryItemInput,
  DocumentContent,
  DocumentDTO,
  FacetDTO,
  LibraryItemDTO,
} from './types'

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

export function useDocument(relPath: string | null): UseQueryResult<DocumentContent | null> {
  return useQuery({
    queryKey: ['document', relPath],
    queryFn: () => getDataClient().readDocument(relPath as string),
    enabled: relPath !== null && relPath.length > 0,
  })
}

interface SaveVars {
  relPath: string
  body: string
  title?: string
}

export function useSaveDocument(): UseMutationResult<DocumentContent, Error, SaveVars> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ relPath, body, title }: SaveVars) =>
      getDataClient().saveDocument(relPath, { body, ...(title !== undefined ? { title } : {}) }),
    onSuccess: (doc) => {
      queryClient.setQueryData(['document', doc.relPath], doc)
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useCreateDocument(): UseMutationResult<
  DocumentContent,
  Error,
  CreateDocumentInput
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDocumentInput) => getDataClient().createDocument(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useLibraryItems(): UseQueryResult<LibraryItemDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['library'],
    queryFn: () => getDataClient().listLibraryItems(),
    enabled: ready,
  })
}

export function useCreateLibraryItem(): UseMutationResult<
  DocumentContent,
  Error,
  CreateLibraryItemInput
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLibraryItemInput) => getDataClient().createLibraryItem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['library'] })
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useFacets(facet: string | null): UseQueryResult<FacetDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['facets', facet],
    queryFn: () => getDataClient().listFacets(facet ?? undefined),
    enabled: ready,
  })
}

export function useAllConnections(): UseQueryResult<ConnectionEdgeDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => getDataClient().listConnections(),
    enabled: ready,
  })
}

export function useDocumentConnections(
  documentId: string | null,
): UseQueryResult<ConnectionEdgeDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['connections', 'doc', documentId],
    queryFn: () => getDataClient().listDocumentConnections(documentId as string),
    enabled: ready && documentId !== null && documentId.length > 0,
  })
}

export function useCreateConnection(): UseMutationResult<void, Error, CreateConnectionInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateConnectionInput) => getDataClient().createConnection(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useDeleteConnection(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => getDataClient().deleteConnection(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}
