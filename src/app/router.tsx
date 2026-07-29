import { createBrowserRouter } from 'react-router-dom'
import { StudioPage } from '@/features/studio/StudioPage'
import { DocumentView } from '@/features/studio/DocumentView'
import { FilesPage } from '@/features/files/FilesPage'
import { SourceView } from '@/features/files/SourceView'
import { LibraryPage } from '@/features/library/LibraryPage'
import { ConnectionsPage } from '@/features/connections/ConnectionsPage'
import { QueryTrackerPage } from '@/features/query-tracker/QueryTrackerPage'
import { SearchPage } from '@/features/search/SearchPage'
import { Shell } from './Shell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <StudioPage /> },
      { path: 'doc/*', element: <DocumentView /> },
      { path: 'files', element: <FilesPage /> },
      { path: 'file/*', element: <SourceView /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'connections', element: <ConnectionsPage /> },
      { path: 'query-tracker', element: <QueryTrackerPage /> },
      { path: 'search', element: <SearchPage /> },
    ],
  },
])
