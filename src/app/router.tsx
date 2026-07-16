import { createBrowserRouter } from 'react-router-dom'
import { StudioPage } from '@/features/studio/StudioPage'
import { DocumentView } from '@/features/studio/DocumentView'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SearchPage } from '@/features/search/SearchPage'
import { ComingSoon } from '@/shared/ui/ComingSoon'
import { Shell } from './Shell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <StudioPage /> },
      { path: 'doc/*', element: <DocumentView /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'connections', element: <ComingSoon title="Connections" phase="Phase 9" /> },
      { path: 'query-tracker', element: <ComingSoon title="Query Tracker" phase="Phase 12" /> },
      { path: 'search', element: <SearchPage /> },
    ],
  },
])
