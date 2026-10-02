import { useRef, type KeyboardEvent, type ReactNode } from 'react'

import { useInsideGlass } from './glassContext'

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
 * Segmented control with a sliding indicator. A grid of 1fr columns makes every segment as wide
 * as the widest label, so the indicator is just a CSS transform of its index — no measuring.
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
  const nested = useInsideGlass()
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

  const height = size === 'sm' ? 'h-8' : 'h-10'

  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      onKeyDown={onKeyDown}
      className={`${nested ? 'glass-inset' : 'glass-pill'} relative inline-grid auto-cols-fr grid-flow-col p-1 ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-[image:var(--accent-gradient)] shadow-[var(--accent-glow)] transition-transform duration-300 ease-spring"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
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
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed ${height} ${
              iconOnly ? (size === 'sm' ? 'min-w-8 px-2' : 'min-w-10 px-2.5') : 'px-3.5 text-sm'
            } ${selected ? 'text-accent-fg' : 'text-fg-muted hover:text-fg disabled:opacity-50 disabled:hover:text-fg-muted'}`}
          >
            {option.icon}
            {!iconOnly && option.label}
          </button>
        )
      })}
    </div>
  )
}
