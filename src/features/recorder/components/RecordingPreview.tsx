import { Clock, Download, HardDrive, RotateCcw, Trash2, X } from 'lucide-react'

import { useObjectUrlRef } from '@/shared/hooks/useObjectUrl'
import { formatBytes, formatDuration } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Tag } from '@/shared/ui/Tag'

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
        <h2 className="truncate text-base font-medium" title={recording.name}>
          {recording.name}
        </h2>
        <Button
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
        className="aspect-video w-full rounded-control border border-line bg-black"
      />

      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon={<Download size={16} />}
            onClick={() => downloadRecording(recording)}
          >
            Download
          </Button>
          <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={onRerecord}>
            Re-record
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete recording"
            title="Delete recording"
            onClick={onDelete}
            icon={<Trash2 size={16} />}
          />
        </div>
        <div className="flex gap-2">
          <Tag mono icon={<Clock size={13} />} aria-label="Duration">
            {formatDuration(recording.duration)}
          </Tag>
          <Tag mono icon={<HardDrive size={13} />} aria-label="File size">
            {formatBytes(recording.size)}
          </Tag>
        </div>
      </div>
    </div>
  )
}
