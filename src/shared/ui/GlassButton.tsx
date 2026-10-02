import type { ComponentPropsWithRef, ReactNode } from 'react'

import { useInsideGlass } from './glassContext'

export type GlassButtonVariant = 'primary' | 'glass' | 'ghost' | 'danger'
export type GlassButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm'

type GlassButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  variant?: GlassButtonVariant
  size?: GlassButtonSize
  icon?: ReactNode
  children?: ReactNode
}

const SIZES: Record<GlassButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-14 gap-2.5 px-8 text-base',
  xl: 'h-16 gap-3 px-10 text-lg',
  icon: 'size-10',
  'icon-sm': 'size-8',
}

/** Shared press/hover feel: a quick spring on transform, 0.97 scale on press. */
export const pressable =
  'transition-[transform,background-color,box-shadow,opacity] duration-200 ease-spring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'

export function GlassButton({
  variant = 'glass',
  size = 'md',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: GlassButtonProps) {
  const nested = useInsideGlass()

  const look: Record<GlassButtonVariant, string> = {
    primary:
      'bg-[image:var(--accent-gradient)] text-accent-fg shadow-[var(--accent-glow)] hover:brightness-110',
    glass: `${nested ? 'glass-inset' : 'glass-pill'} text-fg hover:[--pill-bg:var(--glass-bg-inset-hover)]`,
    ghost: 'text-fg-muted hover:bg-inset-hover hover:text-fg',
    danger: 'bg-danger-solid text-white hover:brightness-110',
  }

  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap select-none ${SIZES[size]} ${look[variant]} ${pressable} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
