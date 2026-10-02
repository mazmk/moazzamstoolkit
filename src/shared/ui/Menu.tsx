import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

export interface MenuItem {
  id: string
  label: string
  icon?: ReactNode
  description?: string
  /** Right-aligned hint, e.g. a shortcut or "active". */
  hint?: ReactNode
  /** Router path — renders a link. */
  to?: string
  onSelect?: () => void
  disabled?: boolean
  /** Shown as a tooltip and appended to the accessible description. */
  title?: string
}

export interface MenuGroup {
  label?: string
  items: MenuItem[]
}

export interface MenuTriggerProps {
  ref: Ref<HTMLButtonElement>
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
  'aria-controls': string
  onClick: () => void
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void
}

interface MenuProps {
  /** Accessible name of the menu itself. */
  label: string
  groups: MenuGroup[]
  align?: 'start' | 'center' | 'end'
  /** Render the trigger button; spread the props onto a <button>. */
  trigger: (props: MenuTriggerProps) => ReactNode
  /** Width of the panel in px. */
  width?: number
}

const GAP = 8
const VIEWPORT_MARGIN = 8

/**
 * Menu button (WAI-ARIA menu pattern): ArrowUp/Down/Home/End move, Enter/Space activate, Esc and
 * Tab close. The panel is portalled to <body> and positioned against the trigger, so it never
 * nests a backdrop-filter inside a blurred toolbar or navbar.
 */
export function Menu({ label, groups, align = 'start', trigger, width = 300 }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const focusFirstRef = useRef<'first' | 'last' | null>(null)
  const menuId = useId()

  const items = () =>
    Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    )

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const panelWidth = Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2)
    const ideal =
      align === 'end'
        ? rect.right - panelWidth
        : align === 'center'
          ? rect.left + rect.width / 2 - panelWidth / 2
          : rect.left
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, ideal),
      window.innerWidth - panelWidth - VIEWPORT_MARGIN,
    )
    setPosition({ top: rect.bottom + GAP, left })
  }, [align, width])

  useLayoutEffect(() => {
    if (!open) return
    place()
  }, [open, place])

  // Focus the first/last item once the panel has rendered.
  useEffect(() => {
    if (!open || !position) return
    const which = focusFirstRef.current
    focusFirstRef.current = null
    const list = items()
    ;(which === 'last' ? list.at(-1) : list[0])?.focus()
  }, [open, position])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        close(false)
      }
    }
    const onResize = () => place()
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open, close, place])

  const openWith = (focus: 'first' | 'last') => {
    focusFirstRef.current = focus
    setOpen(true)
  }

  const onPanelKeyDown = (e: KeyboardEvent) => {
    const list = items()
    const index = list.indexOf(document.activeElement as HTMLElement)
    const move = (i: number) => list[(i + list.length) % list.length]?.focus()
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        move(index + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        move(index - 1)
        break
      case 'Home':
        e.preventDefault()
        move(0)
        break
      case 'End':
        e.preventDefault()
        move(list.length - 1)
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'Tab':
        close(false)
        break
    }
  }

  const triggerProps: MenuTriggerProps = {
    ref: triggerRef,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': menuId,
    onClick: () => (open ? close(false) : openWith('first')),
    onKeyDown: (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        openWith(e.key === 'ArrowDown' ? 'first' : 'last')
      }
    },
  }

  const itemClass =
    'flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left text-sm text-ink outline-none transition-colors duration-150 ease-out hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

  const renderItem = (item: MenuItem) => {
    const content = (
      <>
        {item.icon && (
          <span className="grid size-5 shrink-0 place-items-center text-muted">{item.icon}</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{item.label}</span>
          {item.description && (
            <span className="block truncate text-xs text-muted">{item.description}</span>
          )}
        </span>
        {item.hint && (
          <span className="shrink-0 font-mono text-[11px] text-muted">{item.hint}</span>
        )}
      </>
    )
    if (item.to && !item.disabled) {
      return (
        <Link
          role="menuitem"
          tabIndex={-1}
          to={item.to}
          title={item.title}
          onClick={() => close(false)}
          className={itemClass}
        >
          {content}
        </Link>
      )
    }
    return (
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        aria-disabled={item.disabled || undefined}
        title={item.title}
        onClick={() => {
          if (item.disabled) return
          close()
          item.onSelect?.()
        }}
        className={itemClass}
      >
        {content}
      </button>
    )
  }

  return (
    <>
      {trigger(triggerProps)}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onPanelKeyDown}
            style={{
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width: Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2),
            }}
            className="fixed z-50 rounded-panel glass-float p-1 [--float-mix:94%] motion-safe:animate-[pop-in_150ms_var(--ease)]"
          >
            {groups.map((group, gi) => (
              <div
                key={group.label ?? group.items[0]?.id}
                role="group"
                aria-label={group.label}
                className={gi > 0 ? 'mt-1 border-t border-line pt-1' : ''}
              >
                {group.label && (
                  <div
                    aria-hidden
                    className="px-2.5 pt-2 pb-1 font-mono text-[11px] tracking-[0.06em] text-muted uppercase"
                  >
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => (
                  <div key={item.id} role="none">
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
