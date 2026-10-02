interface ProgressBarProps {
  /** 0–1, or null for indeterminate. Values are clamped. */
  value: number | null
  label: string
  /** Describes the value for assistive tech, e.g. "Converting… 42%". */
  valueText?: string
  /** Show a mono percentage next to the bar. */
  showPercent?: boolean
  className?: string
}

/** A flat 6px bar: --surface-2 track, solid accent fill. No stripes, no glow. */
export function ProgressBar({
  value,
  label,
  valueText,
  showPercent = false,
  className = '',
}: ProgressBarProps) {
  const clamped = value === null ? null : Math.min(1, Math.max(0, value))
  const percent = clamped === null ? undefined : Math.round(clamped * 100)

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={valueText}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2"
      >
        {clamped === null ? (
          <div className="h-full w-1/3 bg-accent motion-safe:animate-[progress-indeterminate_1.2s_var(--ease)_infinite]" />
        ) : (
          <div
            className="h-full bg-accent transition-[width] duration-150 ease-out"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
      {showPercent && (
        <span aria-hidden className="w-10 shrink-0 text-right font-mono text-xs tabular-nums">
          {percent === undefined ? '—' : `${percent}%`}
        </span>
      )}
    </div>
  )
}
