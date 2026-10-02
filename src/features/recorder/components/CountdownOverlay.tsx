import { useEffect, useRef } from 'react'

import { Button } from '@/shared/ui/Button'

interface CountdownOverlayProps {
  value: number
  onCancel: () => void
}

/**
 * Full-screen 3-2-1 before recording. A native modal <dialog> keeps focus inside and makes the
 * page behind inert; its ::backdrop covers the page with near-opaque paper (no blur).
 */
export function CountdownOverlay({ value, onCancel }: CountdownOverlayProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label="Recording countdown"
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none place-items-center bg-transparent p-0 text-ink backdrop:bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] open:grid"
    >
      <div className="flex flex-col items-center gap-10">
        {/* Re-keyed per number so the pop animation restarts each second. */}
        <span
          key={value}
          aria-hidden
          className="countdown-number font-display text-[clamp(9rem,34vw,18rem)] leading-none text-ink motion-safe:animate-[countdown-tick_1s_var(--ease)_both]"
        >
          {value}
        </span>
        <p className="sr-only" aria-live="assertive">
          Recording starts in {value}
        </p>
        <Button variant="secondary" autoFocus onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </dialog>
  )
}
