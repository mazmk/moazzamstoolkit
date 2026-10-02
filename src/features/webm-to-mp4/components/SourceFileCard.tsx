import { Clock, HardDrive, Loader2, Maximize2, X } from 'lucide-react'

import { useObjectUrlRef } from '@/shared/hooks/useObjectUrl'
import { formatBytes } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Tag } from '@/shared/ui/Tag'

import { formatClock } from '../lib/files'
import type { ProbedVideo } from '../lib/probe'

interface SourceFileCardProps {
  file: File
  probe: ProbedVideo | null
  onRemove: () => void
  disabled?: boolean
}

export function SourceFileCard({ file, probe, onRemove, disabled }: SourceFileCardProps) {
  const previewRef = useObjectUrlRef<HTMLVideoElement>(file)

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <video
        ref={previewRef}
        controls
        playsInline
        preload="metadata"
        aria-label={`Preview of ${file.name}`}
        className="aspect-video w-full rounded-control border border-line bg-black object-contain sm:w-64 sm:shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 font-medium break-words" title={file.name}>
            {file.name}
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${file.name}`}
            title="Remove"
            disabled={disabled}
            onClick={onRemove}
            icon={<X size={16} />}
          />
        </div>
        <div className="flex flex-wrap gap-2" aria-live="polite">
          <Tag mono icon={<HardDrive size={13} />} aria-label="File size">
            {formatBytes(file.size)}
          </Tag>
          {probe === null ? (
            <Tag icon={<Loader2 size={13} className="animate-spin" />}>Reading video…</Tag>
          ) : (
            <>
              <Tag mono icon={<Clock size={13} />} aria-label="Duration">
                {probe.durationSec !== null ? formatClock(probe.durationSec * 1000) : 'Unknown'}
              </Tag>
              <Tag mono icon={<Maximize2 size={13} />} aria-label="Resolution">
                {probe.dimensions
                  ? `${probe.dimensions.width}×${probe.dimensions.height}`
                  : 'Unknown'}
              </Tag>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
