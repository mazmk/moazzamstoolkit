import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { pressable } from './GlassButton'
import { useInsideGlass } from './glassContext'

type ChipProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  pressed: boolean
  icon?: ReactNode
  children: ReactNode
}

/** A toggle chip (aria-pressed). The "on" state carries a faint accent wash and accent text. */
export function Chip({ pressed, icon, children, className = '', ...rest }: ChipProps) {
  const nested = useInsideGlass()
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`${nested ? 'glass-inset' : 'glass-pill'} inline-flex h-9 items-center gap-1.5 px-3.5 text-sm ${
        pressed
          ? 'text-accent-text [--pill-bg:color-mix(in_oklab,var(--accent-from)_16%,var(--glass-bg-inset))]'
          : 'text-fg-muted hover:text-fg hover:[--pill-bg:var(--glass-bg-inset-hover)]'
      } ${pressable} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
