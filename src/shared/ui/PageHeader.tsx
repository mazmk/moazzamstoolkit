import type { ReactNode } from 'react'

import { TOOLS, toolNumber } from '@/app/tools'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  /** Derives the eyebrow ("TOOL 03 / VIDEO") from the registry. */
  toolId?: string
  /** Overrides the derived eyebrow. */
  eyebrow?: string
  /** Rendered on the right of the title row (e.g. a status tag). */
  aside?: ReactNode
}

/** Left-aligned page header: mono eyebrow, display-serif title, muted subline. */
export function PageHeader({ title, description, toolId, eyebrow, aside }: PageHeaderProps) {
  const tool = toolId ? TOOLS.find((t) => t.id === toolId) : undefined
  const label =
    eyebrow ?? (tool ? `Tool ${toolNumber(tool.id) ?? ''} / ${tool.category}` : undefined)

  return (
    <header className="mb-10">
      {label && (
        <p className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">{label}</p>
      )}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(36px,5vw,56px)] leading-[0.95] tracking-[-0.01em]">
          {title}
        </h1>
        {aside}
      </div>
      {description && <p className="mt-4 max-w-[60ch] text-muted">{description}</p>}
    </header>
  )
}
