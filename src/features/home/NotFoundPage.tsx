import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/shared/ui/PageHeader'

export function NotFoundPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Error / 404"
        title="There’s no tool here."
        description="The link may be old, or the tool was renamed."
      />
      <Link
        to="/"
        className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-medium text-accent-ink transition-colors duration-150 ease-out hover:bg-[var(--accent-hover)]"
      >
        <ArrowLeft size={16} aria-hidden />
        All tools
      </Link>
    </div>
  )
}
