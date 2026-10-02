import { CornerDownLeft, Home, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { TOOLS } from './tools'

interface Entry {
  id: string
  name: string
  description: string
  category: string
  path: string
  icon: typeof Home
  keywords: string[]
}

const ENTRIES: Entry[] = [
  {
    id: 'home',
    name: 'All tools',
    description: 'Go to the home page',
    category: 'Navigation',
    path: '/',
    icon: Home,
    keywords: ['home', 'start'],
  },
  ...TOOLS.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    path: t.path,
    icon: t.icon,
    keywords: t.keywords ?? [],
  })),
]

/** Every whitespace-separated term must appear somewhere in the entry's searchable text. */
export function filterEntries<T extends Omit<Entry, 'icon' | 'path' | 'id'>>(
  entries: T[],
  query: string,
) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return entries
  return entries.filter((e) => {
    const haystack = [e.name, e.description, e.category, ...e.keywords].join(' ').toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}

export const isMac = () =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

/** Cmd/Ctrl+K palette for jumping between tools. A native modal <dialog> traps focus. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const results = useMemo(() => filterEntries(ENTRIES, query), [query])
  const activeIndex = Math.min(active, Math.max(0, results.length - 1))

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      inputRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const close = () => {
    setQuery('')
    setActive(0)
    onClose()
  }

  const go = (entry: Entry | undefined) => {
    if (!entry) return
    close()
    navigate(entry.path)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((activeIndex + step + results.length) % Math.max(1, results.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[activeIndex])
    }
  }

  const optionId = (i: number) => `${listId}-option-${i}`

  return (
    <dialog
      ref={dialogRef}
      aria-label="Jump to a tool"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      // Transparent dialog with a floating glass panel inside, over a dimmed (not blurred) backdrop.
      // which would break the modal's fixed positioning).
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-lg overflow-visible bg-transparent p-0 text-ink backdrop:bg-scrim"
    >
      <div className="overflow-hidden rounded-panel glass-float [--float-mix:94%] motion-safe:animate-[pop-in_150ms_var(--ease)]">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
            aria-label="Search tools"
            placeholder="Search tools…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden rounded-[6px] border border-line px-1.5 py-0.5 font-mono text-[11px] text-muted sm:inline">
            Esc
          </kbd>
        </div>

        <ul
          id={listId}
          role="listbox"
          aria-label="Tools"
          className="max-h-[50vh] overflow-y-auto p-2"
        >
          {results.length === 0 && (
            <li role="presentation" className="px-3 py-6 text-center text-sm text-muted">
              No tools match “{query}”.
            </li>
          )}
          {results.map((entry, i) => {
            const Icon = entry.icon
            const selected = i === activeIndex
            return (
              <li
                key={entry.id}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                onPointerMove={() => setActive(i)}
                onClick={() => go(entry)}
                className={`flex cursor-pointer items-center gap-3 rounded-[8px] px-2.5 py-2 ${
                  selected ? 'bg-surface-2' : ''
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-line text-muted">
                  <Icon size={17} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{entry.name}</span>
                  <span className="block truncate text-xs text-muted">{entry.description}</span>
                </span>
                {selected ? (
                  <CornerDownLeft size={15} className="shrink-0 text-muted" aria-hidden />
                ) : (
                  <span className="shrink-0 font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
                    {entry.category}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </dialog>
  )
}
