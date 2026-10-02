import { Download, Video } from 'lucide-react'
import { AnimatePresence, LazyMotion, MotionConfig, m } from 'motion/react'
import { NavLink, useLocation, useOutlet } from 'react-router-dom'

import { ThemeToggle } from '@/shared/theme/ThemeToggle'
import { useApplyTheme } from '@/shared/theme/theme'
import { AmbientBackground } from '@/shared/ui/AmbientBackground'
import { Toaster } from '@/shared/ui/Toast'

const NAV_ITEMS = [
  { to: '/record', label: 'Record', icon: Video },
  { to: '/download', label: 'Download', icon: Download },
]

const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default)

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const

const routeKey = (pathname: string) => (pathname.startsWith('/download') ? '/download' : '/record')

function Logo() {
  return (
    <span className="flex items-center gap-2 pl-1">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-[image:var(--accent-gradient)] shadow-[var(--accent-glow)]"
      >
        <span className="size-3 rounded-full bg-white/95" />
      </span>
      <span className="hidden text-sm font-semibold tracking-tight sm:inline">ScreenNest</span>
    </span>
  )
}

/**
 * The route switch looks like the shared Segmented control but is made of real links (so
 * middle-click and "open in new tab" work). Its indicator is a shared-layout Motion element.
 */
function NavSwitch() {
  const active = routeKey(useLocation().pathname)

  return (
    <nav
      aria-label="Main"
      className="glass-inset relative inline-grid auto-cols-fr grid-flow-col p-1"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        const isActive = to === active
        return (
          <NavLink
            key={to}
            to={to}
            aria-current={isActive ? 'page' : undefined}
            className={`relative inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors duration-200 sm:px-4 ${
              isActive ? 'text-accent-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {isActive && (
              <m.span
                layoutId="nav-indicator"
                transition={SPRING}
                className="absolute inset-0 rounded-full bg-[image:var(--accent-gradient)] shadow-[var(--accent-glow)]"
              />
            )}
            <Icon size={15} className="relative hidden sm:block" />
            <span className="relative">{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export function Layout() {
  useApplyTheme()
  const { pathname } = useLocation()
  const outlet = useOutlet()

  return (
    // reducedMotion="user": Motion drops transform animations when the OS asks for less motion.
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <AmbientBackground />

        <div className="flex min-h-dvh flex-col">
          <header className="sticky top-0 z-40 px-3 pt-3 sm:pt-5">
            {/* The nav bar is the blurred layer; its controls use the non-blurred inset material. */}
            <div className="glass-strong mx-auto flex max-w-[720px] items-center justify-between gap-2 rounded-full p-1.5">
              <Logo />
              <NavSwitch />
              <ThemeToggle />
            </div>
          </header>

          <main className="mx-auto w-full max-w-[720px] flex-1 px-4 pt-10 pb-16 sm:pt-16 sm:pb-24">
            <AnimatePresence mode="wait" initial={false}>
              {/* Opacity + translate only: a `filter` here (even blur(0)) would make this wrapper a
                backdrop root and stop every glass card inside from blurring the background. */}
              <m.div
                key={routeKey(pathname)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {outlet}
              </m.div>
            </AnimatePresence>
          </main>

          <footer className="pb-8 text-center text-xs text-fg-muted">
            Everything stays in your browser.
          </footer>
        </div>

        <Toaster />
      </MotionConfig>
    </LazyMotion>
  )
}
