import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

type PanelProps<T extends ElementType> = {
  as?: T
  className?: string
  children?: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

/** A page surface: solid --surface, 1px --line border, 14px radius. No blur, no shadow. */
export function Panel<T extends ElementType = 'div'>({
  as,
  className = '',
  children,
  ...rest
}: PanelProps<T>) {
  const Component: ElementType = as ?? 'div'
  return (
    <Component className={`panel ${className}`} {...rest}>
      {children}
    </Component>
  )
}
