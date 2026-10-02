import type { ComponentPropsWithRef, ReactNode } from 'react'

import { useInsideGlass } from './glassContext'

type GlassInputProps = Omit<ComponentPropsWithRef<'input'>, 'size'> & {
  /** Decorative icon at the start of the pill. */
  leading?: ReactNode
  /** Buttons rendered inside the pill, after the input. */
  trailing?: ReactNode
  size?: 'md' | 'lg'
  containerClassName?: string
}

/**
 * A pill-shaped input that can hold buttons inside it. The focus ring is drawn on the pill
 * (focus-within) so the whole control reads as one field.
 */
export function GlassInput({
  leading,
  trailing,
  size = 'md',
  containerClassName = '',
  className = '',
  ...rest
}: GlassInputProps) {
  const nested = useInsideGlass()
  return (
    <div
      className={`${nested ? 'glass-inset' : 'glass-pill'} flex items-center gap-1 transition-shadow duration-200 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${
        size === 'lg' ? 'h-14 pr-1.5 pl-5' : 'h-11 pr-1 pl-4'
      } ${containerClassName}`}
    >
      {leading && (
        <span aria-hidden className="shrink-0 text-fg-subtle">
          {leading}
        </span>
      )}
      <input
        className={`h-full min-w-0 flex-1 bg-transparent px-2 text-fg placeholder:text-fg-subtle focus:outline-none ${
          size === 'lg' ? 'text-base' : 'text-sm'
        } ${className}`}
        {...rest}
      />
      {trailing && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
    </div>
  )
}
