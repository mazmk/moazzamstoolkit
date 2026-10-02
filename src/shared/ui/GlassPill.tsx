import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { useInsideGlass } from './glassContext'

type GlassPillProps = ComponentPropsWithoutRef<'span'> & {
  icon?: ReactNode
  /** Monospace text — for sizes, durations and other numbers. */
  mono?: boolean
  size?: 'sm' | 'md'
  /** Text color. A prop rather than a className override, which would compete with the default. */
  tone?: 'muted' | 'default' | 'accent'
}

const TONES = { muted: 'text-fg-muted', default: 'text-fg', accent: 'text-accent-text' }

/** A static, non-interactive glass pill: badges, metadata, labels. */
export function GlassPill({
  icon,
  mono = false,
  size = 'sm',
  tone = 'muted',
  className = '',
  children,
  ...rest
}: GlassPillProps) {
  const nested = useInsideGlass()
  return (
    <span
      className={`${nested ? 'glass-inset' : 'glass-pill'} inline-flex items-center gap-1.5 ${TONES[tone]} ${
        size === 'sm' ? 'min-h-7 px-3 py-1 text-xs' : 'min-h-9 px-4 py-1.5 text-sm'
      } ${mono ? 'font-mono tabular-nums' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </span>
  )
}
