import { Download, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { formatDuration } from '@/shared/lib/format'

import { useRecorderStore, type SavedRecording } from '../store'

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function downloadRecording(r: SavedRecording) {
  const url = URL.createObjectURL(r.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${r.name.replace(/[^\w\- ]+/g, '-')}.webm`
  a.click()
  URL.revokeObjectURL(url)
}

export function RecordingsList() {
  const recordings = useRecorderStore((s) => s.recordings)
  const loadRecordings = useRecorderStore((s) => s.loadRecordings)
  const deleteRecording = useRecorderStore((s) => s.deleteRecording)
  const [pendingDelete, setPendingDelete] = useState<SavedRecording | null>(null)

  useEffect(() => {
    loadRecordings().catch((err: unknown) => console.error('Failed to load recordings', err))
  }, [loadRecordings])

  const confirmDelete = () => {
    if (pendingDelete) void deleteRecording(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-medium text-fg">Recordings</h2>
      {recordings.length === 0 ? (
        <p className="mt-2 text-sm text-fg-subtle">No recordings yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-surface">
          {recordings.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-fg" title={r.name}>
                  {r.name}
                </p>
                <p className="text-xs text-fg-subtle">
                  {formatDuration(r.duration)} · {formatSize(r.size)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => downloadRecording(r)}
                  aria-label={`Download ${r.name}`}
                  className="rounded-md p-2 text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                >
                  <Download size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(r)}
                  aria-label={`Delete ${r.name}`}
                  className="rounded-md p-2 text-fg-muted transition-colors hover:bg-surface-muted hover:text-danger"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete recording?"
        description={
          <>
            <span className="font-medium text-fg">{pendingDelete?.name}</span> will be permanently
            removed from this browser. This can’t be undone.
          </>
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}
