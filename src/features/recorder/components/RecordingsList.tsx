import { Download, Trash2 } from 'lucide-react'
import { useEffect } from 'react'

import { useRecorderStore, type SavedRecording } from '../store'
import { formatDuration } from '../lib/format'

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

  useEffect(() => {
    loadRecordings().catch((err: unknown) => console.error('Failed to load recordings', err))
  }, [loadRecordings])

  return (
    <section className="mt-10">
      <h2 className="text-lg font-medium text-white">Recordings</h2>
      {recordings.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No recordings yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-800 rounded-md border border-gray-800">
          {recordings.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-gray-100">{r.name}</p>
                <p className="text-xs text-gray-500">
                  {formatDuration(r.duration)} · {formatSize(r.size)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadRecording(r)}
                  aria-label={`Download ${r.name}`}
                  className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
                >
                  <Download size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteRecording(r.id)}
                  aria-label={`Delete ${r.name}`}
                  className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
