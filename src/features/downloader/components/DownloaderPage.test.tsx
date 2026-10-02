import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DownloaderPage } from './DownloaderPage'

const LOOM_ID = 'ae4bdcb7209f4769b5e5e43194a2b76d'
const MPD_URL = 'https://luna.loom.com/id/x/resource/dash/playlist.mpd?Policy=p'
const MPD = `<MPD><Period><AdaptationSet contentType="video">
  <Representation id="hd" bandwidth="5000000" width="1920" height="1080"><SegmentTemplate initialization="i.webm" media="$Number$.webm"><SegmentTimeline><S t="0" d="1"/></SegmentTimeline></SegmentTemplate></Representation>
  <Representation id="sd" bandwidth="1500000" width="1280" height="720"><SegmentTemplate initialization="i.webm" media="$Number$.webm"><SegmentTimeline><S t="0" d="1"/></SegmentTimeline></SegmentTemplate></Representation>
</AdaptationSet></Period></MPD>`

function mockLoom() {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/v1/oembed')) {
      return Promise.resolve(Response.json({ title: 'Sprint demo', duration: 89.7 }))
    }
    if (url.endsWith('/transcoded-url')) return Promise.resolve(new Response(null, { status: 204 }))
    if (url.endsWith('/raw-url')) return Promise.resolve(Response.json({ url: MPD_URL }))
    if (url === MPD_URL) return Promise.resolve(new Response(MPD))
    return Promise.reject(new Error(`unexpected fetch ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

async function submit(url: string) {
  await userEvent.type(screen.getByLabelText('Video link'), url)
  await userEvent.click(screen.getByRole('button', { name: 'Fetch' }))
}

describe('DownloaderPage', () => {
  it('resolves a Loom link and offers each quality', async () => {
    mockLoom()
    render(<DownloaderPage />)

    await submit(`https://www.loom.com/share/${LOOM_ID}`)

    expect(await screen.findByRole('heading', { name: 'Sprint demo' })).toBeInTheDocument()
    const card = screen.getByRole('article')
    expect(within(card).getByText('Loom')).toBeInTheDocument()
    expect(screen.getByLabelText('Duration')).toHaveTextContent('1:29')
    const quality = screen.getByRole('radiogroup', { name: 'Quality' })
    expect(
      within(quality)
        .getAllByRole('radio')
        .map((o) => o.textContent),
    ).toEqual(['1080p', '720p'])
    expect(within(quality).getByRole('radio', { name: '1080p' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
  })

  it('explains when a Loom video is private or missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))),
    )
    render(<DownloaderPage />)

    await submit(`https://www.loom.com/share/${LOOM_ID}`)

    expect(await screen.findByRole('alert')).toHaveTextContent(/private, password-protected/)
  })

  it('says Jam is not supported yet without making requests', async () => {
    const fetchMock = mockLoom()
    render(<DownloaderPage />)

    await submit('https://jam.dev/c/657c97b6-6d5c-4194-b96d-b4ab4e886a49')

    expect(await screen.findByRole('alert')).toHaveTextContent(/Jam links aren’t supported yet/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects links from other sites', async () => {
    render(<DownloaderPage />)

    await submit('https://youtube.com/watch?v=abc')

    expect(await screen.findByRole('alert')).toHaveTextContent(/Paste a Loom/)
  })
})
