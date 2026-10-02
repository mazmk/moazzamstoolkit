import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CountdownOverlay } from './CountdownOverlay'

describe('CountdownOverlay', () => {
  it('announces the count and focuses Cancel', () => {
    render(<CountdownOverlay value={3} onCancel={() => {}} />)

    expect(screen.getByText('Recording starts in 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('cancels from the button', async () => {
    const onCancel = vi.fn()
    render(<CountdownOverlay value={2} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
