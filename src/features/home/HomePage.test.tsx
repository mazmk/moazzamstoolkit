import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { TOOLS, toolsByCategory } from '@/app/tools'
import { Chip } from '@/shared/ui/Chip'
import { Segmented } from '@/shared/ui/Segmented'

import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders a numbered index of every tool, grouped by category, from the registry', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Small tools for annoying jobs.',
    )
    expect(
      screen.getByText(`Toolkit / ${String(TOOLS.length).padStart(2, '0')} tools`),
    ).toBeInTheDocument()

    for (const { category, tools } of toolsByCategory()) {
      const section = screen.getByRole('region', { name: new RegExp(`^${category}`) })
      const links = within(section).getAllByRole('link')
      expect(links.map((l) => l.getAttribute('href'))).toEqual(tools.map((t) => t.path))
    }
    // Each row is one link containing index, name and description.
    const first = screen.getAllByRole('link')[0]!
    expect(first).toHaveTextContent(/^01/)
    expect(first).toHaveTextContent(TOOLS[0]!.description)
  })
})

describe('selection styling', () => {
  it('fills selected chips and segments with ink, not accent', () => {
    render(
      <>
        <Chip pressed>On</Chip>
        <Segmented
          aria-label="View"
          value="a"
          onChange={() => {}}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />
      </>,
    )
    const chip = screen.getByRole('button', { name: 'On' })
    expect(chip).toHaveClass('bg-ink', 'text-paper')
    expect(chip.className).not.toMatch(/accent/)
    expect(screen.getByRole('radio', { name: 'A' })).toHaveClass('text-paper')
  })
})
