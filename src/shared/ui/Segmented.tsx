import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  disabled?: boolean
  title?: string
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  /** Show icons only; labels become accessible names. */
  iconOnly?: boolean
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}

/**
 * Segmented switch with a sliding ink indicator. A grid of 1fr columns makes every segment as wide
 * as the widest label, so the indicator is just a transform of its index — no measuring.
 * Keyboard: a radiogroup with roving tabindex, so Tab enters once and arrow keys move the selection.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  iconOnly = false,
  size = 'md',
  disabled = false,
  className = '',
  ...aria
}: SegmentedProps<T>) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    for (let i = 1; i <= options.length; i++) {
      const next = (index + step * i + options.length) % options.length
      const option = options[next]
      if (option && !option.disabled) {
        onChange(option.value)
        buttonsRef.current[next]?.focus()
        return
      }
    }
  }

  const height = size === 'sm' ? 'h-7' : 'h-9'

  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      onKeyDown={onKeyDown}
      className={`relative inline-grid auto-cols-fr grid-flow-col rounded-full border border-line p-0.5 ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-full bg-ink transition-transform duration-150 ease-out"
        style={{
          width: `calc((100% - 0.25rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option, i) => {
        const selected = i === index
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonsRef.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={iconOnly ? option.label : undefined}
            title={option.title ?? (iconOnly ? option.label : undefined)}
            tabIndex={selected ? 0 : -1}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors duration-150 ease-out disabled:cursor-not-allowed ${height} ${
              iconOnly ? (size === 'sm' ? 'min-w-7 px-1.5' : 'min-w-9 px-2') : 'px-3.5 text-[13px]'
            } ${
              selected
                ? 'text-paper'
                : 'text-muted hover:text-ink disabled:opacity-50 disabled:hover:text-muted'
            }`}
          >
            {option.icon}
            {!iconOnly && option.label}
          </button>
        )
      })}
    </div>
  )
}
