import { ChevronDown, LayoutGrid, Loader2 } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Link, useLocation, useOutlet } from 'react-router-dom'

import logoMark from '@/assets/logo-mark.svg'
import { ThemeToggle } from '@/shared/theme/ThemeToggle'
import { useApplyTheme } from '@/shared/theme/theme'
import { Backdrop } from '@/shared/ui/Backdrop'
import { Button } from '@/shared/ui/Button'
import { Menu } from '@/shared/ui/Menu'
import { Toaster } from '@/shared/ui/Toast'

import { CommandPalette, isMac } from './CommandPalette'
import { SITE, pageTitle } from './toolMeta'
import { TOOLS, findToolByPath, toolsByCategory } from './tools'

/** Re-points a canonical URL at another page, stripping only known tool paths from the current one. */
export function canonicalFor(current: string, toolPath?: string): string {
  const own = TOOLS.map((t) => `${t.path.slice(1)}/`).find((p) => current.endsWith(`/${p}`))
  const root = own ? current.slice(0, -own.length) : current
  return toolPath ? `${root}${toolPath.slice(1)}/` : root
}

function Logo() {
  return (
    <Link
      to="/"
      aria-label="Moazzam’s Toolkit — all tools"
      className="flex shrink-0 items-center gap-2 rounded-full py-1 pr-2 pl-1"
    >
      <img src={logoMark} alt="" width={28} height={28} className="size-7" />
      <span className="hidden text-sm font-medium tracking-tight sm:inline">Moazzam’s Toolkit</span>
    </Link>
  )
}

function ToolsMenu({ currentPath }: { currentPath: string }) {
  const groups = toolsByCategory().map(({ category, tools }) => ({
    label: category,
    items: tools.map((tool) => {
      const Icon = tool.icon
      return {
        id: tool.id,
        label: tool.name,
        description: tool.description,
        icon: <Icon size={16} />,
        to: tool.path,
        hint: tool.path === currentPath ? 'OPEN' : undefined,
      }
    }),
  }))

  return (
    <Menu
      label="Tools"
      align="start"
      width={340}
      groups={[
        { items: [{ id: 'home', label: 'All tools', icon: <LayoutGrid size={16} />, to: '/' }] },
        ...groups,
      ]}
      trigger={(props) => (
        <Button {...props} variant="ghost" size="sm" className="gap-1 rounded-full text-[13px]">
          Tools
          <ChevronDown
            size={14}
            aria-hidden
            className={`transition-transform duration-150 ${props['aria-expanded'] ? 'rotate-180' : ''}`}
          />
        </Button>
      )}
    />
  )
}

function PageFallback() {
  return (
    <div role="status" className="flex py-24 text-muted">
      <Loader2 size={20} className="animate-spin" aria-hidden />
      <span className="sr-only">Loading tool…</span>
    </div>
  )
}

export function Layout() {
  useApplyTheme()
  const { pathname } = useLocation()
  const outlet = useOutlet()
  const [paletteOpen, setPaletteOpen] = useState(false)

  const tool = findToolByPath(pathname)
  const full = tool?.layout === 'full'
  const mac = isMac()
  const shortcut = mac ? '⌘K' : 'Ctrl K'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Keep title, description and canonical in step with in-app navigation. The static HTML for each
  // page is generated at build time with the same strings (build/seo.ts).
  useEffect(() => {
    document.title = pageTitle(tool)
    const description = tool?.seoDescription ?? SITE.description
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonical) canonical.href = canonicalFor(canonical.href, tool?.path)
  }, [tool])

  return (
    <>
      <Backdrop />

      <div className={`flex flex-col ${full ? 'h-dvh' : 'min-h-dvh'}`}>
        {/* Sticky floating pill; page content scrolls underneath its restrained glass. */}
        <header className="sticky top-4 z-40 shrink-0 px-3">
          <div className="mx-auto flex max-w-[880px] items-center gap-1 rounded-full glass-float p-1 [--float-mix:72%]">
            <Logo />
            <nav aria-label="Main" className="flex items-center">
              <ToolsMenu currentPath={pathname} />
            </nav>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label={`Search tools (${shortcut})`}
                aria-keyshortcuts={mac ? 'Meta+K' : 'Control+K'}
                title="Search tools"
                className="hidden h-7 items-center rounded-[6px] border border-line bg-surface px-2 font-mono text-[11px] text-muted transition-colors duration-150 ease-out hover:text-ink sm:inline-flex"
              >
                {shortcut}
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main
          className={
            full
              ? 'flex min-h-0 w-full flex-1 flex-col px-3 pt-8 pb-3'
              : 'mx-auto w-full max-w-[880px] flex-1 px-5 pt-16 pb-20 sm:px-8 sm:pt-24'
          }
        >
          {/* Re-keyed per route so each page change plays the 8px fade-up. */}
          <div
            key={tool?.id ?? pathname}
            className={`motion-safe:animate-[page-in_160ms_var(--ease)] ${full ? 'flex min-h-0 flex-1 flex-col' : ''}`}
          >
            <Suspense fallback={<PageFallback />}>{outlet}</Suspense>
          </div>
        </main>

        {!full && (
          <footer className="mx-auto w-full max-w-[880px] px-5 pb-8 sm:px-8">
            <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
              <span>Moazzam’s Toolkit</span>
              <span>Runs in your browser · Nothing is uploaded</span>
            </div>
          </footer>
        )}
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </>
  )
}
