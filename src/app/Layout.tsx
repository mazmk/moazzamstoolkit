import { Download, Video, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { ThemeToggle } from '@/shared/theme/ThemeToggle'
import { useApplyTheme } from '@/shared/theme/theme'

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/record', label: 'Record', icon: Video },
  { to: '/download', label: 'Video Downloader', icon: Download },
]

function NavLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Main" className={className}>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
            }`
          }
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Layout() {
  useApplyTheme()

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <span className="text-lg font-semibold tracking-tight">ScreenNest</span>
          <div className="flex items-center gap-3">
            <NavLinks className="hidden gap-1 sm:flex" />
            <ThemeToggle />
          </div>
        </div>
        {/* On phones the nav gets its own full-width row so labels never truncate. */}
        <NavLinks className="mx-auto mt-3 grid max-w-4xl grid-cols-2 gap-1 sm:hidden" />
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
