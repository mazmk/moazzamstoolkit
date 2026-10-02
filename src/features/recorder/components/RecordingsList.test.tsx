import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useRecorderStore, type SavedRecording } from '../store'
import { RecordingsList } from './RecordingsList'

const recording: SavedRecording = {
  id: 'rec-1',
  name: 'Bug repro',
  blob: new Blob(['x']),
  duration: 61_000,
  createdAt: 0,
  size: 2048,
}

const deleteRecording = vi.fn(() => Promise.resolve())

beforeEach(() => {
  deleteRecording.mockClear()
  useRecorderStore.setState({
    recordings: [recording],
    loadRecordings: () => Promise.resolve(),
    deleteRecording,
  })
})

describe('RecordingsList delete confirmation', () => {
  it('asks before deleting and deletes on confirm', async () => {
    render(<RecordingsList />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete Bug repro' }))
    expect(deleteRecording).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog', { name: 'Delete recording?' })
    expect(dialog).toHaveTextContent('Bug repro')

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(deleteRecording).toHaveBeenCalledWith('rec-1')
  })

  it('keeps the recording when cancelled', async () => {
    render(<RecordingsList />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete Bug repro' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(deleteRecording).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
