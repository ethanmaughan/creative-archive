import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useSession } from '@/app/store/session'
import type { Agent } from '@/domain/models/agent'
import type { SubmissionEvent } from '@/domain/models/submission-log'
import type { SubmissionStatus } from '@/domain/models/submission'
import { getDataClient } from './data-client'
import type {
  AiRunResultDTO,
  AiStatus,
  GraphDTO,
  CreateDocumentInput,
  CreateLibraryItemInput,
  CreateMarketInput,
  CreateSpaceDocInput,
  CreateSpaceInput,
  CreateSubmissionInput,
  DocumentContent,
  DocumentDTO,
  FacetDTO,
  LibraryItemDTO,
  LibrarySort,
  MarketDTO,
  ReferenceDTO,
  SearchResultDTO,
  SourceContentDTO,
  SpaceDTO,
  SubmissionDTO,
  TagCountDTO,
  TopicPageDTO,
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

export function useSearch(
  query: string,
  kind: string | null,
  scope: string | null = null,
): UseQueryResult<SearchResultDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['search', trimmed, kind, scope],
    queryFn: () => getDataClient().search(trimmed, kind ?? undefined, scope ?? undefined),
    enabled: ready && trimmed.length > 0,
  })
}

export function useSpaces(): UseQueryResult<SpaceDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['spaces'],
    queryFn: () => getDataClient().listSpaces(),
    enabled: ready,
  })
}

export function useCreateSpace(): UseMutationResult<SpaceDTO, Error, CreateSpaceInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSpaceInput) => getDataClient().createSpace(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spaces'] })
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
      void queryClient.invalidateQueries({ queryKey: ['tree'] })
    },
  })
}

export function useCreateSpaceDocument(): UseMutationResult<
  DocumentContent,
  Error,
  CreateSpaceDocInput
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSpaceDocInput) => getDataClient().createSpaceDocument(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['spaces'] })
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
      void queryClient.invalidateQueries({ queryKey: ['tree'] })
    },
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
      void queryClient.invalidateQueries({ queryKey: ['references'] })
      void queryClient.invalidateQueries({ queryKey: ['topic'] })
      void queryClient.invalidateQueries({ queryKey: ['tags'] })
      void queryClient.invalidateQueries({ queryKey: ['tag-docs'] })
      void queryClient.invalidateQueries({ queryKey: ['document-tags'] })
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
      // A new note may resolve previously-broken `[[topic]]` links elsewhere.
      void queryClient.invalidateQueries({ queryKey: ['references'] })
      void queryClient.invalidateQueries({ queryKey: ['topic'] })
    },
  })
}

export function useLibraryItems(sort?: LibrarySort): UseQueryResult<LibraryItemDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['library', sort?.by ?? null, sort?.dir ?? null],
    queryFn: () => getDataClient().listLibraryItems(sort),
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

export function useGraph(): UseQueryResult<GraphDTO> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['graph'],
    queryFn: () => getDataClient().getGraph(),
    enabled: ready,
  })
}

export function useReferences(documentId: string | null): UseQueryResult<ReferenceDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['references', documentId],
    queryFn: () => getDataClient().listReferences(documentId as string),
    enabled: ready && documentId !== null && documentId.length > 0,
  })
}

export function useTopicPage(name: string | null): UseQueryResult<TopicPageDTO> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['topic', name],
    queryFn: () => getDataClient().topicPage(name as string),
    enabled: ready && name !== null && name.length > 0,
  })
}

export function useTags(): UseQueryResult<TagCountDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => getDataClient().listTags(),
    enabled: ready,
  })
}

export function useDocumentsByTag(name: string | null): UseQueryResult<DocumentDTO[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['tag-docs', name],
    queryFn: () => getDataClient().listDocumentsByTag(name as string),
    enabled: ready && name !== null && name.length > 0,
  })
}

export function useDocumentTags(documentId: string | null): UseQueryResult<string[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['document-tags', documentId],
    queryFn: () => getDataClient().listDocumentTags(documentId as string),
    enabled: ready && documentId !== null && documentId.length > 0,
  })
}

export function useAgentManuscripts(): UseQueryResult<string[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['agent-manuscripts'],
    queryFn: () => getDataClient().listAgentManuscripts(),
    enabled: ready,
  })
}

export function useAgents(slug: string | null): UseQueryResult<Agent[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['agents', slug],
    queryFn: () => getDataClient().listAgents(slug as string),
    enabled: ready && slug !== null && slug.length > 0,
  })
}

export function useSaveAgents(): UseMutationResult<void, Error, { slug: string; agents: Agent[] }> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, agents }: { slug: string; agents: Agent[] }) =>
      getDataClient().saveAgents(slug, agents),
    onSuccess: (_data, { slug }) => {
      void queryClient.invalidateQueries({ queryKey: ['agents', slug] })
    },
  })
}

export function useCreateAgentManuscript(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => getDataClient().createAgentManuscript(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agent-manuscripts'] })
    },
  })
}

export function useSubmissionLog(slug: string | null): UseQueryResult<SubmissionEvent[]> {
  const ready = useSession((s) => s.status === 'ready')
  return useQuery({
    queryKey: ['submission-log', slug],
    queryFn: () => getDataClient().listSubmissionLog(slug as string),
    enabled: ready && slug !== null && slug.length > 0,
  })
}

export function useAppendSubmissionLog(): UseMutationResult<
  void,
  Error,
  { slug: string; event: SubmissionEvent }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, event }: { slug: string; event: SubmissionEvent }) =>
      getDataClient().appendSubmissionLog(slug, event),
    onSuccess: (_data, { slug }) => {
      void queryClient.invalidateQueries({ queryKey: ['submission-log', slug] })
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
