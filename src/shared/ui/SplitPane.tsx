import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

interface SplitPaneProps {
  start: ReactNode
  end: ReactNode
  /** Accessible name for the divider, e.g. "Resize editor and preview". */
  label: string
  /** Remembers the divider position in localStorage under this key. */
  storageKey?: string
  defaultRatio?: number
  min?: number
  max?: number
  className?: string
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function readRatio(key: string | undefined, fallback: number) {
  if (!key) return fallback
  try {
    const n = Number(localStorage.getItem(key))
    return Number.isFinite(n) && n > 0 && n < 1 ? n : fallback
  } catch {
    return fallback
  }
}

/**
 * Two side-by-side panes with a draggable divider. The divider is a focusable `separator`:
 * arrow keys move it 2% (Shift: 10%), Home/End jump to the limits, double-click resets.
 */
export function SplitPane({
  start,
  end,
  label,
  storageKey,
  defaultRatio = 0.5,
  min = 0.2,
  max = 0.8,
  className = '',
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState(() => clamp(readRatio(storageKey, defaultRatio), min, max))
  const [dragging, setDragging] = useState(false)

  const commit = (next: number) => {
    const value = clamp(next, min, max)
    setRatio(value)
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, value.toFixed(4))
      } catch {
        // position just won't persist
      }
    }
  }

  const ratioAt = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    return rect && rect.width > 0 ? (clientX - rect.left) / rect.width : ratio
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) setRatio(clamp(ratioAt(e.clientX), min, max))
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDragging(false)
    commit(ratioAt(e.clientX))
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02
    const next =
      e.key === 'ArrowLeft'
        ? ratio - step
        : e.key === 'ArrowRight'
          ? ratio + step
          : e.key === 'Home'
            ? min
            : e.key === 'End'
              ? max
              : null
    if (next === null) return
    e.preventDefault()
    commit(next)
  }

  return (
    <div
      ref={containerRef}
      className={`grid min-h-0 ${dragging ? 'cursor-col-resize select-none' : ''} ${className}`}
      style={{ gridTemplateColumns: `minmax(0, ${ratio}fr) 12px minmax(0, ${1 - ratio}fr)` }}
    >
      <div className="flex min-h-0 min-w-0 flex-col">{start}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={Math.round(min * 100)}
        aria-valuemax={Math.round(max * 100)}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDragging(false)}
        onDoubleClick={() => commit(defaultRatio)}
        title="Drag to resize · double-click to reset"
        className="group relative flex cursor-col-resize touch-none items-center justify-center rounded-control focus-visible:outline-2 focus-visible:outline-offset-0"
      >
        <span
          aria-hidden
          className={`h-10 w-[3px] rounded-full transition-colors duration-150 ease-out ${
            dragging ? 'bg-accent' : 'bg-line group-hover:bg-accent'
          }`}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-col">{end}</div>
    </div>
  )
}
