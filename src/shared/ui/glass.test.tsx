import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { Chip } from './Chip'
import { GlassButton } from './GlassButton'
import { GlassCard } from './GlassCard'
import { Segmented } from './Segmented'

function SegmentedHarness() {
  const [value, setValue] = useState('a')
  return (
    <Segmented
      aria-label="Letters"
      value={value}
      onChange={setValue}
      options={[
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', disabled: true },
        { value: 'c', label: 'C' },
      ]}
    />
  )
}

describe('Segmented', () => {
  it('is a single tab stop and moves selection with arrow keys, skipping disabled options', async () => {
    render(<SegmentedHarness />)
    const [a, , c] = screen.getAllByRole('radio')

    expect(a).toHaveAttribute('tabindex', '0')
    expect(c).toHaveAttribute('tabindex', '-1')

    await userEvent.click(a!)
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'C' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked()
  })
})

describe('glass nesting', () => {
  it('uses blurred glass on the page but the non-blurred inset material inside a card', () => {
    render(
      <>
        <GlassButton>Outside</GlassButton>
        <GlassCard>
          <GlassButton>Inside</GlassButton>
          <Chip pressed={false}>Chip</Chip>
        </GlassCard>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveClass('glass-pill')
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveClass('glass-inset')
    expect(screen.getByRole('button', { name: 'Inside' })).not.toHaveClass('glass-pill')
    expect(screen.getByRole('button', { name: 'Chip' })).toHaveClass('glass-inset')
  })
})
