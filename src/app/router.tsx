import { createBrowserRouter } from 'react-router-dom'

import { HomePage } from '@/features/home/HomePage'
import { NotFoundPage } from '@/features/home/NotFoundPage'

import { Layout } from './Layout'
import { TOOLS } from './tools'

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <HomePage /> },
        // Every tool route comes from the registry; Layout wraps them in <Suspense>.
        ...TOOLS.map(({ path, component: Page }) => ({ path, element: <Page /> })),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  // Matches Vite's `base`, so routes work when served from a subpath (GitHub Pages).
  { basename: import.meta.env.BASE_URL },
)
