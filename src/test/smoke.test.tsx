import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import { RecorderPage } from '@/features/recorder/components/RecorderPage'
import { DownloaderPage } from '@/features/downloader/components/DownloaderPage'

describe('RecorderPage', () => {
  it('renders heading', () => {
    render(
      <MemoryRouter>
        <RecorderPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Screen Recorder')).toBeInTheDocument()
  })
})

describe('DownloaderPage', () => {
  it('renders heading', () => {
    render(
      <MemoryRouter>
        <DownloaderPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Video Downloader')).toBeInTheDocument()
  })
})
