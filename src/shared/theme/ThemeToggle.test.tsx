import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { ThemeToggle } from './ThemeToggle'
import { useApplyTheme, useThemeStore } from './theme'

function Harness() {
  useApplyTheme()
  return <ThemeToggle />
}

beforeEach(() => {
  useThemeStore.setState({ theme: 'system' })
  document.documentElement.classList.remove('dark')
})

describe('ThemeToggle', () => {
  it('switches the dark class on <html> and persists the choice', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('radio', { name: 'Dark theme' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByRole('radio', { name: 'Dark theme' })).toBeChecked()
    expect(localStorage.getItem('screennest:theme')).toContain('"theme":"dark"')

    await userEvent.click(screen.getByRole('radio', { name: 'Light theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
