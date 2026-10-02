import type { ComponentPropsWithRef, ReactNode } from 'react'

type TextFieldProps = Omit<ComponentPropsWithRef<'input'>, 'size'> & {
  /** Decorative icon at the start of the field. */
  leading?: ReactNode
  /** Buttons rendered inside the field, after the input. */
  trailing?: ReactNode
  size?: 'md' | 'lg'
  containerClassName?: string
}

/**
 * An input that can hold buttons inside it. The 2px accent focus ring is drawn on the container
 * (focus-within), so the whole control reads as one field.
 */
export function TextField({
  leading,
  trailing,
  size = 'md',
  containerClassName = '',
  className = '',
  ...rest
}: TextFieldProps) {
  return (
    <div
      className={`flex items-center gap-1 rounded-control border border-line bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
        size === 'lg' ? 'h-14 pr-1.5 pl-4' : 'h-11 pr-1 pl-3.5'
      } ${containerClassName}`}
    >
      {leading && (
        <span aria-hidden className="shrink-0 text-muted">
          {leading}
        </span>
      )}
      <input
        className={`h-full min-w-0 flex-1 bg-transparent px-2 text-ink placeholder:text-muted focus:outline-none ${
          size === 'lg' ? 'text-base' : 'text-sm'
        } ${className}`}
        {...rest}
      />
      {trailing && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
    </div>
  )
}
