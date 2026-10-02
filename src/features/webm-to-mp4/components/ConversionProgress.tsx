import { Loader2, X } from 'lucide-react'

import { Button } from '@/shared/ui/Button'
import { ProgressBar } from '@/shared/ui/ProgressBar'

import { formatClock } from '../lib/files'

interface ConversionProgressProps {
  ratio: number | null
  elapsedMs: number
  remainingMs: number | null
  waitingForEngine: boolean
  onCancel: () => void
}

export function ConversionProgress({
  ratio,
  elapsedMs,
  remainingMs,
  waitingForEngine,
  onCancel,
}: ConversionProgressProps) {
  const percent = ratio === null ? null : Math.round(ratio * 100)
  const status = waitingForEngine
    ? 'Waiting for the converter to load…'
    : percent === null
      ? 'Converting… (progress unavailable for this file)'
      : `Converting… ${percent}%`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 font-mono text-2xl tabular-nums">
          <Loader2 size={18} className="animate-spin text-accent" aria-hidden />
          {percent === null || waitingForEngine ? 'Converting' : `${percent}%`}
        </p>
        <Button variant="secondary" size="sm" onClick={onCancel} icon={<X size={14} />}>
          Cancel
        </Button>
      </div>

      <ProgressBar
        value={waitingForEngine ? null : ratio}
        label="Conversion progress"
        valueText={status}
      />

      <dl className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs">
        <div className="flex gap-1.5">
          <dt className="tracking-[0.06em] text-muted uppercase">Elapsed</dt>
          <dd className="font-mono tabular-nums">{formatClock(elapsedMs)}</dd>
        </div>
        {remainingMs !== null && (
          <div className="flex gap-1.5">
            <dt className="tracking-[0.06em] text-muted uppercase">About</dt>
            <dd className="font-mono tabular-nums">{formatClock(remainingMs)} left</dd>
          </div>
        )}
      </dl>

      {/* Coarse updates for screen readers; the bar itself carries the exact value. */}
      <p className="sr-only" aria-live="polite">
        {percent !== null && percent % 10 === 0 ? status : ''}
      </p>
      <p className="text-xs text-muted">
        Conversion runs on your device. Keep this tab open — larger files can take a few minutes.
      </p>
    </div>
  )
}
