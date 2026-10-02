import { Monitor, Moon, Sun } from 'lucide-react'

import { Segmented } from '@/shared/ui/Segmented'

import { useThemeStore, type Theme } from './theme'

const OPTIONS = [
  { value: 'light' as const, label: 'Light theme', icon: <Sun size={15} /> },
  { value: 'dark' as const, label: 'Dark theme', icon: <Moon size={15} /> },
  { value: 'system' as const, label: 'System theme', icon: <Monitor size={15} /> },
]

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <Segmented<Theme>
      aria-label="Theme"
      options={OPTIONS}
      value={theme}
      onChange={setTheme}
      iconOnly
      size="sm"
    />
  )
}
