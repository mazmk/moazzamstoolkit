import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect } from 'react'
import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastStore {
  toasts: ToastItem[]
  push: (message: string, tone: ToastTone) => void
  dismiss: (id: number) => void
}

const MAX_TOASTS = 3
let nextId = 1

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone) =>
    set((s) => ({ toasts: [...s.toasts, { id: nextId++, message, tone }].slice(-MAX_TOASTS) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Show a toast from anywhere — components, hooks or plain functions. */
export function toast(message: string, tone: ToastTone = 'info') {
  useToastStore.getState().push(message, tone)
}

const ICONS = { info: Info, success: CheckCircle2, error: AlertCircle }
const ICON_COLOR = { info: 'text-muted', success: 'text-success', error: 'text-danger' }
const DURATION_MS = 4000

function ToastView({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const Icon = ICONS[item.tone]

  useEffect(() => {
    const id = setTimeout(() => dismiss(item.id), DURATION_MS)
    return () => clearTimeout(id)
  }, [dismiss, item.id])

  return (
    <li className="pointer-events-auto flex w-full items-center gap-2.5 rounded-control glass-float py-2 pr-1.5 pl-3 text-[13px] text-ink [--float-mix:92%] motion-safe:animate-[pop-in_150ms_var(--ease)]">
      <Icon size={16} className={`shrink-0 ${ICON_COLOR[item.tone]}`} aria-hidden />
      <span className="min-w-0 flex-1">{item.message}</span>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss notification"
        className="grid size-7 shrink-0 place-items-center rounded-[8px] text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        <X size={14} />
      </button>
    </li>
  )
}

/** Mount once near the app root. Toasts stack bottom-right (above the recorder bar on phones). */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-end px-4 sm:right-4 sm:bottom-4 sm:left-auto"
    >
      <ol className="flex w-full max-w-xs flex-col gap-2">
        {toasts.map((t) => (
          <ToastView key={t.id} item={t} />
        ))}
      </ol>
    </div>
  )
}
