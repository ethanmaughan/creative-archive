import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useSession } from '@/app/store/session'
import type { SubmissionStatus } from '@/domain/models/submission'
import { getDataClient } from './data-client'
import type {
  AiRunResultDTO,
  AiStatus,
  ConnectionEdgeDTO,
  CreateConnectionInput,
  CreateDocumentInput,
  CreateLibraryItemInput,
  CreateMarketInput,
  CreateSubmissionInput,
  DocumentContent,
  DocumentDTO,
  FacetDTO,
  LibraryItemDTO,
  MarketDTO,
  SearchResultDTO,
  SourceContentDTO,
  SubmissionDTO,
  TreeEntryDTO,
} from './types'

export function useDocuments(): UseQueryResult<DocumentDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => getDataClient().listDocuments(),
    enabled: ready,
  })
}

export function useTree(): UseQueryResult<TreeEntryDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['tree'],
    queryFn: () => getDataClient().listTree(),
    enabled: ready,
  })
}

export function useSource(relPath: string | null): UseQueryResult<SourceContentDTO | null> {
  return useQuery({
    queryKey: ['source', relPath],
    queryFn: () => getDataClient().readSource(relPath as string),
    enabled: relPath !== null && relPath.length > 0,
  })
}

export function useSearch(query: string, kind: string | null): UseQueryResult<SearchResultDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['search', trimmed, kind],
    queryFn: () => getDataClient().search(trimmed, kind ?? undefined),
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
      void queryClient.invalidateQueries({ queryKey: ['tree'] })
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
      void queryClient.invalidateQueries({ queryKey: ['tree'] })
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

export function useAiStatus(): UseQueryResult<AiStatus> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: () => getDataClient().aiStatus(),
    enabled: ready,
    staleTime: 60_000,
  })
}

interface SummarizeVars {
  relPath: string
  model: string
}

export function useSummarize(): UseMutationResult<AiRunResultDTO, Error, SummarizeVars> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ relPath, model }: SummarizeVars) =>
      getDataClient().summarizeDocument(relPath, model),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useSuggestEdits(): UseMutationResult<AiRunResultDTO, Error, SummarizeVars> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ relPath, model }: SummarizeVars) => getDataClient().suggestEdits(relPath, model),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useCheckConsistency(): UseMutationResult<AiRunResultDTO, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (model: string) => getDataClient().checkConsistency(model),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useMarkets(): UseQueryResult<MarketDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['markets'],
    queryFn: () => getDataClient().listMarkets(),
    enabled: ready,
  })
}

export function useCreateMarket(): UseMutationResult<void, Error, CreateMarketInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMarketInput) => getDataClient().createMarket(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['markets'] })
    },
  })
}

export function useSubmissions(): UseQueryResult<SubmissionDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['submissions'],
    queryFn: () => getDataClient().listSubmissions(),
    enabled: ready,
  })
}

export function useCreateSubmission(): UseMutationResult<void, Error, CreateSubmissionInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSubmissionInput) => getDataClient().createSubmission(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
  })
}

interface TransitionVars {
  id: string
  to: SubmissionStatus
}

export function useTransitionSubmission(): UseMutationResult<void, Error, TransitionVars> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, to }: TransitionVars) => getDataClient().transitionSubmission(id, to),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
  })
}
