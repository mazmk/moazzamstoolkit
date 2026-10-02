import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RecorderPage } from './RecorderPage'

function fakeStream() {
  const track = { stop: vi.fn(), clone: vi.fn(), getSettings: () => ({ width: 1280, height: 720 }) }
  return {
    getTracks: () => [track],
    getAudioTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream
}

function mockMediaDevices(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(getUserMedia) },
  })
}

afterEach(() => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
})

describe('RecorderPage permissions', () => {
  it('shows the gate and hides recording controls until access is granted', () => {
    mockMediaDevices(() => Promise.resolve(fakeStream()))
    render(<RecorderPage />)

    expect(screen.getByText('Allow camera and microphone')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start recording/i })).not.toBeInTheDocument()
  })

  it('unlocks recording controls after both permissions are granted', async () => {
    mockMediaDevices(() => Promise.resolve(fakeStream()))
    render(<RecorderPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Grant access' }))

    expect(await screen.findByRole('button', { name: /start recording/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mic on/i })).toBeInTheDocument()
  })

  it('explains how to recover when access is blocked', async () => {
    mockMediaDevices(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))
    render(<RecorderPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Grant access' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/site settings/i)
    expect(screen.getAllByText('Blocked')).toHaveLength(2)
  })
})
