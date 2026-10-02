import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { pressable } from './Button'

type ChipProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  pressed: boolean
  icon?: ReactNode
  children: ReactNode
}

/** A toggle chip (aria-pressed). Outline when off; ink fill with paper text when on — never accent. */
export function Chip({ pressed, icon, children, className = '', ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm ${
        pressed
          ? 'border-ink bg-ink text-paper'
          : 'border-line text-muted hover:bg-surface-2 hover:text-ink'
      } ${pressable} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
