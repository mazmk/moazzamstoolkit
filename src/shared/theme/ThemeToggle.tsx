import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'

import { useThemeStore, type Theme } from './theme'

const OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex shrink-0 gap-0.5 rounded-lg border border-line bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          onClick={() => setTheme(value)}
          className={`rounded-md p-1.5 transition-colors ${
            theme === value ? 'bg-surface-muted text-fg' : 'text-fg-subtle hover:text-fg'
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}
