import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type TagProps = ComponentPropsWithoutRef<'span'> & {
  icon?: ReactNode
  /** Monospace — for sizes, durations, categories and other labels. Default true. */
  mono?: boolean
  tone?: 'muted' | 'ink' | 'accent'
}

const TONES = { muted: 'text-muted', ink: 'text-ink', accent: 'text-accent-text' }

/** A small static badge with a hairline outline. */
export function Tag({
  icon,
  mono = true,
  tone = 'muted',
  className = '',
  children,
  ...rest
}: TagProps) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs ${
        mono ? 'font-mono tabular-nums' : ''
      } ${TONES[tone]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </span>
  )
}
