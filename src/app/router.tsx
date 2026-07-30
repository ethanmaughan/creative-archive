import { createBrowserRouter } from 'react-router-dom'
import { StudioPage } from '@/features/studio/StudioPage'
import { DocumentView } from '@/features/studio/DocumentView'
import { FilesPage } from '@/features/files/FilesPage'
import { SourceView } from '@/features/files/SourceView'
import { SpacesPage } from '@/features/spaces/SpacesPage'
import { SpaceView } from '@/features/spaces/SpaceView'
import { TagsPage } from '@/features/tags/TagsPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { ConnectionsPage } from '@/features/connections/ConnectionsPage'
import { GraphPage } from '@/features/graph/GraphPage'
import { QueryTrackerPage } from '@/features/query-tracker/QueryTrackerPage'
import { SearchPage } from '@/features/search/SearchPage'
import { HelpPage } from '@/features/help/HelpPage'
import { Shell } from './Shell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <StudioPage /> },
      { path: 'doc/*', element: <DocumentView /> },
      { path: 'spaces', element: <SpacesPage /> },
      { path: 'space/:slug', element: <SpaceView /> },
      { path: 'files', element: <FilesPage /> },
      { path: 'file/*', element: <SourceView /> },
      { path: 'tags', element: <TagsPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'connections', element: <ConnectionsPage /> },
      { path: 'graph', element: <GraphPage /> },
      { path: 'query-tracker', element: <QueryTrackerPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'help', element: <HelpPage /> },
    ],
  },
])
