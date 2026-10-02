import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

/** Soft red-tinted glass for inline errors. Announced to screen readers via role="alert". */
export function InlineError({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={`glass-danger flex items-start gap-2.5 px-4 py-3 text-sm text-danger ${className}`}
    >
      <AlertCircle size={17} className="mt-px shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
