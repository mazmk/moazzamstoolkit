import { AlertCircle, Ban, Check, CircleSlash, Clock, Loader2, Target } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Tag } from '@/shared/ui/Tag'

import type { ImageItem } from '../lib/types'

type Tone = ComponentProps<typeof Tag>['tone']

export function statusLabel(item: Pick<ImageItem, 'status' | 'progress' | 'message'>): string {
  switch (item.status) {
    case 'queued':
      return 'Queued'
    case 'processing':
      return item.progress > 0 ? `Compressing ${Math.round(item.progress * 100)}%` : 'Compressing'
    case 'done':
      return 'Done'
    case 'optimized':
      return 'Already optimized'
    case 'target-missed':
      return 'Missed target'
    case 'skipped':
      return item.message?.startsWith('Animated') ? 'Animated, skipped' : 'Skipped'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
  }
}

const STYLE: Record<ImageItem['status'], { tone: Tone; Icon: typeof Check }> = {
  queued: { tone: 'muted', Icon: Clock },
  processing: { tone: 'ink', Icon: Loader2 },
  done: { tone: 'success', Icon: Check },
  optimized: { tone: 'ink', Icon: Check },
  'target-missed': { tone: 'warning', Icon: Target },
  skipped: { tone: 'warning', Icon: CircleSlash },
  failed: { tone: 'danger', Icon: AlertCircle },
  cancelled: { tone: 'muted', Icon: Ban },
}

export function StatusChip({ item }: { item: Pick<ImageItem, 'status' | 'progress' | 'message'> }) {
  const { tone, Icon } = STYLE[item.status]
  return (
    <Tag
      tone={tone}
      mono={false}
      icon={
        <Icon
          size={13}
          aria-hidden
          className={item.status === 'processing' ? 'motion-safe:animate-spin' : ''}
        />
      }
    >
      {statusLabel(item)}
    </Tag>
  )
}
