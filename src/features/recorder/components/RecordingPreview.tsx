import { Clock, Download, HardDrive, RotateCcw, Trash2, X } from 'lucide-react'

import { useObjectUrlRef } from '@/shared/hooks/useObjectUrl'
import { formatBytes, formatDuration } from '@/shared/lib/format'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassPill } from '@/shared/ui/GlassPill'

import { downloadRecording } from '../lib/recordingFile'
import type { SavedRecording } from '../store'

interface RecordingPreviewProps {
  recording: SavedRecording
  onRerecord: () => void
  onDelete: () => void
  onClose: () => void
}

export function RecordingPreview({
  recording,
  onRerecord,
  onDelete,
  onClose,
}: RecordingPreviewProps) {
  const videoRef = useObjectUrlRef<HTMLVideoElement>(recording.blob)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="truncate text-lg font-semibold tracking-tight" title={recording.name}>
          {recording.name}
        </h2>
        <GlassButton
          variant="ghost"
          size="icon-sm"
          aria-label="Close preview"
          onClick={onClose}
          icon={<X size={16} />}
        />
      </div>

      <video
        ref={videoRef}
        controls
        playsInline
        className="aspect-video w-full rounded-frame bg-black shadow-[inset_0_0_0_1px_var(--glass-border-bottom)]"
      />

      <div className="glass-inset mt-4 flex flex-col gap-3 p-2 [--pill-radius:var(--radius-card)] sm:flex-row sm:items-center sm:justify-between sm:[--pill-radius:999px]">
        <div className="flex flex-wrap gap-2">
          <GlassButton
            variant="primary"
            icon={<Download size={16} />}
            onClick={() => downloadRecording(recording)}
          >
            Download
          </GlassButton>
          <GlassButton variant="glass" icon={<RotateCcw size={16} />} onClick={onRerecord}>
            Re-record
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="icon"
            aria-label="Delete recording"
            title="Delete recording"
            onClick={onDelete}
            icon={<Trash2 size={16} />}
          />
        </div>
        <div className="flex gap-2 px-1 sm:px-0">
          <GlassPill mono icon={<Clock size={13} />} aria-label="Duration">
            {formatDuration(recording.duration)}
          </GlassPill>
          <GlassPill mono icon={<HardDrive size={13} />} aria-label="File size">
            {formatBytes(recording.size)}
          </GlassPill>
        </div>
      </div>
    </div>
  )
}
