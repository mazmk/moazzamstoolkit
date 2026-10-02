import { CheckCircle2, Cpu } from 'lucide-react'

import { formatBytes } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { InlineError } from '@/shared/ui/InlineError'
import { ProgressBar } from '@/shared/ui/ProgressBar'

import type { EngineState } from '../lib/useFfmpegConverter'

/** The first-load stage: the converter core is ~32 MB the first time, then cached for the session. */
export function EngineStatus({ engine, onRetry }: { engine: EngineState; onRetry: () => void }) {
  if (engine.status === 'error') {
    return (
      <InlineError>
        <p>{engine.error.message}</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      </InlineError>
    )
  }

  if (engine.status === 'ready') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted" role="status">
        <CheckCircle2 size={14} className="text-success" aria-hidden />
        Converter ready — runs entirely on your device.
      </p>
    )
  }

  const ratio =
    engine.status === 'loading' && engine.totalBytes ? engine.loadedBytes / engine.totalBytes : null
  const detail =
    engine.status === 'loading' && engine.loadedBytes > 0
      ? `${formatBytes(engine.loadedBytes)}${engine.totalBytes ? ` of ${formatBytes(engine.totalBytes)}` : ''}`
      : 'Starting…'

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Cpu size={16} className="text-accent" aria-hidden />
          Loading converter…
        </span>
        <span className="font-mono text-xs text-muted tabular-nums">{detail}</span>
      </div>
      <ProgressBar
        value={ratio}
        label="Converter download"
        valueText={`Loading converter: ${detail}`}
      />
      <p className="text-xs text-muted">About 32 MB the first time, then it’s cached.</p>
    </div>
  )
}
