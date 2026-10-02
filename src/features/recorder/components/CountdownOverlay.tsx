import { useEffect, useRef } from 'react'

import { GlassButton } from '@/shared/ui/GlassButton'
import { InsideGlassContext } from '@/shared/ui/glassContext'

interface CountdownOverlayProps {
  value: number
  onCancel: () => void
}

/**
 * Full-screen 3-2-1 before recording. A native modal <dialog> keeps focus inside and makes the
 * page behind inert; its ::backdrop provides the blur.
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
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none place-items-center bg-transparent p-0 text-fg backdrop:bg-[color-mix(in_oklab,var(--bg-base)_55%,transparent)] backdrop:backdrop-blur-2xl open:grid"
    >
      <div className="flex flex-col items-center gap-10">
        {/* Re-keyed per number so the pop animation restarts each second. */}
        <span
          key={value}
          aria-hidden
          className="countdown-number bg-[image:var(--accent-gradient)] bg-clip-text font-mono text-[clamp(8rem,32vw,15rem)] leading-none font-semibold text-transparent motion-safe:animate-[countdown-pop_1s_var(--ease-out)_both]"
        >
          {value}
        </span>
        <p className="sr-only" aria-live="assertive">
          Recording starts in {value}
        </p>
        {/* The backdrop is already blurred, so the button uses the non-blurred inset material. */}
        <InsideGlassContext value>
          <GlassButton variant="glass" autoFocus onClick={onCancel}>
            Cancel
          </GlassButton>
        </InsideGlassContext>
      </div>
    </dialog>
  )
}
