import { createBrowserRouter } from 'react-router-dom'

import { Layout } from './Layout'
import { DownloaderPage } from '@/features/downloader/components/DownloaderPage'
import { RecorderPage } from '@/features/recorder/components/RecorderPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/record', element: <RecorderPage /> },
      { path: '/download', element: <DownloaderPage /> },
      { index: true, element: <RecorderPage /> },
    ],
  },
])
