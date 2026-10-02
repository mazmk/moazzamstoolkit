import type { ComponentPropsWithRef, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm'

type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  children?: ReactNode
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-[15px]',
  xl: 'h-14 gap-2.5 px-8 text-base',
  icon: 'size-10',
  'icon-sm': 'size-8',
}

const VARIANTS: Record<ButtonVariant, string> = {
  // Hover uses --accent-hover (darkens in dark mode, lightens in light mode to keep AA on ink text).
  primary: 'bg-accent text-accent-ink hover:bg-[var(--accent-hover)]',
  secondary: 'border border-line text-ink hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-surface hover:bg-[color-mix(in_srgb,var(--danger)_92%,black)]',
}

/** Shared press feel: a 1px push on active, no scaling or bounce. */
export const pressable =
  'transition-[background-color,border-color,color,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-45'

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap select-none ${SIZES[size]} ${VARIANTS[variant]} ${pressable} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
