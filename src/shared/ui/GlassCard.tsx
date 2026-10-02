import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

import { InsideGlassContext } from './glassContext'

type GlassCardProps<T extends ElementType> = {
  as?: T
  /** `strong` is more opaque and has no sheen — for floating chrome rather than content. */
  variant?: 'default' | 'strong'
  className?: string
  children?: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

export function GlassCard<T extends ElementType = 'div'>({
  as,
  variant = 'default',
  className = '',
  children,
  ...rest
}: GlassCardProps<T>) {
  const Component: ElementType = as ?? 'div'
  return (
    <Component
      className={`${variant === 'strong' ? 'glass-strong' : 'glass'} rounded-card ${className}`}
      {...rest}
    >
      <InsideGlassContext value>{children}</InsideGlassContext>
    </Component>
  )
}
