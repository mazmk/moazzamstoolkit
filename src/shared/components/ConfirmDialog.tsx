import { useEffect, useRef, type ReactNode } from 'react'

import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassCard } from '@/shared/ui/GlassCard'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal confirmation built on the native <dialog>, which gives focus trapping, Esc-to-close and
 * inert background for free.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      // Esc fires `cancel`; route it through onCancel so React state stays the source of truth.
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      // Clicks on the backdrop land on the <dialog> itself, outside the inner panel.
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      // The dialog itself stays transparent: glass utilities set position: relative, which would
      // override the UA's position: fixed for modal dialogs. The backdrop dims without blurring,
      // keeping the number of blurred layers down.
      className="m-auto w-[calc(100%-2rem)] max-w-sm overflow-visible bg-transparent p-0 text-fg backdrop:bg-black/45"
    >
      <GlassCard variant="strong" className="p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && <div className="mt-2 text-sm text-fg-muted">{description}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <GlassButton variant="glass" autoFocus onClick={onCancel}>
            {cancelLabel}
          </GlassButton>
          <GlassButton variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </GlassButton>
        </div>
      </GlassCard>
    </dialog>
  )
}
