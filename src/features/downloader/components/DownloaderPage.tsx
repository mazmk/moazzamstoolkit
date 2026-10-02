import { CheckCircle2, Download, Link2, Loader2, RotateCcw, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { formatDuration } from '@/shared/lib/format'

import { useVideoDownloader, type DownloaderState } from '../hooks/useVideoDownloader'
import { PROVIDER_NAMES } from '../lib/providers'
import type { ResolvedVideo } from '../lib/types'

const primaryButton =
  'flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60'

const SUPPORTED: { name: string; example: string; available: boolean }[] = [
  { name: 'Loom', example: 'loom.com/share/…', available: true },
  { name: 'Jam', example: 'jam.dev/c/…', available: false },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ProgressBar({ value }: { value: number | null }) {
  return (
    <div
      role="progressbar"
      aria-label="Download progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <div
        className={`h-full rounded-full bg-accent transition-[width] duration-150 ${value === null ? 'w-1/3 animate-pulse' : ''}`}
        style={value === null ? undefined : { width: `${Math.round(value * 100)}%` }}
      />
    </div>
  )
}

function DownloadStatus({ state, onCancel }: { state: DownloaderState; onCancel: () => void }) {
  if (state.status !== 'downloading') return null
  const merging = state.phase === 'merging'
  // Stream totals are estimated from bitrate, so cap below 100% until the file is actually done.
  const fraction = merging ? 1 : state.total ? Math.min(0.99, state.loaded / state.total) : null

  return (
    <div className="space-y-2" aria-live="polite">
      <ProgressBar value={fraction} />
      <div className="flex items-center justify-between gap-3 text-xs text-fg-muted">
        <span>
          {merging
            ? 'Merging audio and video…'
            : `${formatBytes(state.loaded)}${state.total ? ` of ~${formatBytes(state.total)}` : ''}`}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
        >
          <X size={13} />
          Cancel
        </button>
      </div>
    </div>
  )
}

interface VideoCardProps {
  video: ResolvedVideo
  state: DownloaderState
  onDownload: (qualityId?: string) => void
  onCancel: () => void
}

function VideoCard({ video, state, onDownload, onCancel }: VideoCardProps) {
  const [qualityId, setQualityId] = useState(video.qualities[0]?.id)
  const busy = state.status === 'downloading'

  return (
    <article className="mt-6 overflow-hidden rounded-lg border border-line bg-surface sm:flex">
      <div className="aspect-video bg-surface-muted sm:w-64 sm:shrink-0">
        {video.thumbnailUrl && (
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
        <div className="min-w-0">
          <h2 className="truncate font-medium text-fg" title={video.title}>
            {video.title}
          </h2>
          <p className="mt-0.5 text-sm text-fg-muted">
            {PROVIDER_NAMES[video.provider]}
            {video.durationMs !== null && ` · ${formatDuration(video.durationMs)}`}
          </p>
        </div>

        {busy ? (
          <DownloadStatus state={state} onCancel={onCancel} />
        ) : (
          <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center">
            {video.qualities.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-fg-muted">
                <span className="sr-only sm:not-sr-only">Quality</span>
                <select
                  value={qualityId}
                  onChange={(e) => setQualityId(e.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-2 py-2 text-sm text-fg sm:w-auto"
                >
                  {video.qualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button type="button" onClick={() => onDownload(qualityId)} className={primaryButton}>
              {state.status === 'done' ? <RotateCcw size={15} /> : <Download size={15} />}
              {state.status === 'done' ? 'Download again' : 'Download'}
            </button>
          </div>
        )}

        {state.status === 'done' && (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 size={15} className="shrink-0" />
            <span className="truncate">Saved {state.fileName}</span>
          </p>
        )}
      </div>
    </article>
  )
}

export function DownloaderPage() {
  const { state, resolve, download, cancel } = useVideoDownloader()
  const [url, setUrl] = useState('')

  const resolving = state.status === 'resolving'
  const video = 'video' in state ? state.video : null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (url.trim()) void resolve(url)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-fg">Video Downloader</h1>
      <p className="mt-2 text-fg-muted">
        Paste a share link to fetch the video and save it to your device.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2 sm:mt-8 sm:flex-row">
        <label htmlFor="video-url" className="sr-only">
          Video link
        </label>
        <div className="relative flex-1">
          <Link2
            size={16}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle"
          />
          <input
            id="video-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            required
            placeholder="https://www.loom.com/share/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border border-line bg-surface py-2 pr-3 pl-9 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
          />
        </div>
        <button type="submit" disabled={resolving} className={primaryButton}>
          {resolving && <Loader2 size={15} className="animate-spin" />}
          {resolving ? 'Fetching…' : 'Fetch video'}
        </button>
      </form>

      <ul className="mt-3 flex flex-wrap gap-2 text-xs" aria-label="Supported sites">
        {SUPPORTED.map((s) => (
          <li
            key={s.name}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-fg-muted"
          >
            <span className="font-medium text-fg">{s.name}</span>
            <span className="text-fg-subtle">{s.example}</span>
            {!s.available && <span className="text-warning">· coming soon</span>}
          </li>
        ))}
      </ul>

      {state.status === 'error' && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {state.message}
        </p>
      )}

      {video && (
        // Remount per video so the quality picker resets to that video's best option.
        <VideoCard
          key={`${video.provider}:${video.id}`}
          video={video}
          state={state}
          onDownload={(qualityId) => void download(video, qualityId)}
          onCancel={cancel}
        />
      )}

      {state.status === 'idle' && (
        <p className="mt-6 text-sm text-fg-subtle">
          Videos are fetched and merged in your browser — nothing is uploaded anywhere.
        </p>
      )}
    </div>
  )
}
