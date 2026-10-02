import { Download, Film, Play, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useObjectUrlRef } from '@/shared/hooks/useObjectUrl'
import { formatBytes, formatDuration } from '@/shared/lib/format'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassPill } from '@/shared/ui/GlassPill'

import { downloadRecording } from '../lib/recordingFile'
import { useRecorderStore, type SavedRecording } from '../store'
import { DeleteRecordingDialog } from './DeleteRecordingDialog'

const tileAction =
  'grid size-8 place-items-center rounded-full bg-black/60 text-white transition-[transform,background-color] duration-200 ease-spring hover:bg-black/80 active:scale-[0.97]'

function RecordingTile({
  recording,
  onOpen,
  onDelete,
}: {
  recording: SavedRecording
  onOpen: () => void
  onDelete: () => void
}) {
  // `#t=0.1` makes the browser decode a frame to use as the thumbnail.
  const thumbRef = useObjectUrlRef<HTMLVideoElement>(recording.blob, '#t=0.1')

  return (
    <li className="group glass-inset relative p-1.5 [--pill-radius:20px]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Play ${recording.name}`}
        className="relative block w-full overflow-hidden rounded-[14px]"
      >
        <video
          ref={thumbRef}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none aspect-video w-full bg-black/40 object-cover"
        />
        <span className="absolute inset-0 grid place-items-center opacity-0 transition duration-200 group-hover:bg-black/25 group-hover:opacity-100">
          <Play size={28} className="text-white drop-shadow" fill="currentColor" />
        </span>
        <span className="absolute right-1.5 bottom-1.5 rounded-full bg-black/65 px-2 py-0.5 font-mono text-[11px] text-white tabular-nums">
          {formatDuration(recording.duration)}
        </span>
      </button>

      <div className="px-1.5 pt-2 pb-1">
        <p className="truncate text-sm font-medium" title={recording.name}>
          {recording.name}
        </p>
        <p className="font-mono text-xs text-fg-subtle tabular-nums">
          {formatBytes(recording.size)}
        </p>
      </div>

      {/* Hover actions; always visible on touch screens and when focused via keyboard. */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <button
          type="button"
          onClick={() => downloadRecording(recording)}
          aria-label={`Download ${recording.name}`}
          className={tileAction}
        >
          <Download size={15} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${recording.name}`}
          className={tileAction}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  )
}

export function RecordingsList({ onOpen }: { onOpen?: (id: string) => void }) {
  const recordings = useRecorderStore((s) => s.recordings)
  const loadRecordings = useRecorderStore((s) => s.loadRecordings)
  const [pendingDelete, setPendingDelete] = useState<SavedRecording | null>(null)

  useEffect(() => {
    loadRecordings().catch((err: unknown) => console.error('Failed to load recordings', err))
  }, [loadRecordings])

  return (
    <GlassCard as="section" aria-labelledby="recent-recordings" className="mt-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 id="recent-recordings" className="text-base font-semibold tracking-tight">
          Recent recordings
        </h2>
        {recordings.length > 0 && (
          <GlassPill mono aria-label={`${recordings.length} recordings`}>
            {recordings.length}
          </GlassPill>
        )}
      </div>

      {recordings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="glass-inset grid size-11 place-items-center text-fg-muted">
            <Film size={20} />
          </span>
          <p className="text-sm text-fg-muted">No recordings yet.</p>
          <p className="text-xs text-fg-subtle">They’ll appear here, saved only in this browser.</p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {recordings.map((r) => (
            <RecordingTile
              key={r.id}
              recording={r}
              onOpen={() => onOpen?.(r.id)}
              onDelete={() => setPendingDelete(r)}
            />
          ))}
        </ul>
      )}

      <DeleteRecordingDialog recording={pendingDelete} onClose={() => setPendingDelete(null)} />
    </GlassCard>
  )
}
