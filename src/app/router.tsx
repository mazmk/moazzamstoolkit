import { createBrowserRouter } from 'react-router-dom'

import { Layout } from './Layout'
import { DownloaderPage } from '@/features/downloader/components/DownloaderPage'
import { RecorderPage } from '@/features/recorder/components/RecorderPage'

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/record', element: <RecorderPage /> },
        { path: '/download', element: <DownloaderPage /> },
        { index: true, element: <RecorderPage /> },
      ],
    },
  ],
  // Matches Vite's `base`, so routes work when served from a subpath (GitHub Pages).
  { basename: import.meta.env.BASE_URL },
)
