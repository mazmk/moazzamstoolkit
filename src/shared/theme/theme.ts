import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

// Keep in sync with the inline script in index.html, which applies the theme before first paint.
export const THEME_STORAGE_KEY = 'screennest:theme'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: THEME_STORAGE_KEY, partialize: ({ theme }) => ({ theme }) },
  ),
)

const darkQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

/** Keeps the `dark` class on <html> in sync with the chosen theme and, in system mode, the OS setting. */
export function useApplyTheme() {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const query = darkQuery()
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && !!query?.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    if (theme !== 'system' || !query) return
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [theme])
}
