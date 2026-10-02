import {
  CheckCircle2,
  ClipboardPaste,
  Clock,
  Download,
  Link2,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'

import { formatBytes, formatDuration } from '@/shared/lib/format'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassInput } from '@/shared/ui/GlassInput'
import { GlassPill } from '@/shared/ui/GlassPill'
import { InlineError } from '@/shared/ui/InlineError'
import { Segmented } from '@/shared/ui/Segmented'
import { toast } from '@/shared/ui/Toast'

import { useVideoDownloader, type DownloaderState } from '../hooks/useVideoDownloader'
import { PROVIDER_NAMES } from '../lib/providers'
import type { ResolvedVideo } from '../lib/types'

const SUPPORTED: { name: string; available: boolean }[] = [
  { name: 'Loom', available: true },
  { name: 'Jam', available: false },
]

// More options than this don't fit a segmented control on a phone; fall back to a select.
const MAX_SEGMENTED_QUALITIES = 3

/**
 * Inline progress inside the download pill. The label is drawn twice — muted text on the track and
 * white text clipped to the gradient fill — so it stays readable wherever the fill edge is.
 */
function DownloadProgress({ state, onCancel }: { state: DownloaderState; onCancel: () => void }) {
  if (state.status !== 'downloading') return null
  const merging = state.phase === 'merging'
  // Stream totals are estimated from bitrate, so cap below 100% until the file is actually done.
  const fraction = merging ? 1 : state.total ? Math.min(0.99, state.loaded / state.total) : null
  const percent = fraction === null ? null : Math.round(fraction * 100)

  const label: ReactNode = merging ? (
    'Merging audio and video…'
  ) : (
    <span className="font-mono tabular-nums">
      {formatBytes(state.loaded)}
      {state.total ? ` of ~${formatBytes(state.total)}` : ''}
    </span>
  )
  const text = (className: string, style?: CSSProperties) => (
    <span
      style={style}
      className={`absolute inset-0 flex items-center justify-center px-4 text-sm font-medium ${className}`}
    >
      {label}
    </span>
  )

  return (
    <div className="flex w-full items-center gap-2" aria-live="polite">
      <div
        role="progressbar"
        aria-label="Download progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="glass-inset relative h-14 flex-1 overflow-hidden"
      >
        <div
          className={`absolute inset-y-0 left-0 bg-[image:var(--accent-gradient)] transition-[width] duration-300 ease-out ${
            percent === null ? 'w-1/3 motion-safe:animate-pulse' : ''
          }`}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
        {text('text-fg')}
        {percent !== null && text('text-white', { clipPath: `inset(0 ${100 - percent}% 0 0)` })}
      </div>
      <GlassButton
        variant="glass"
        size="icon"
        aria-label="Cancel download"
        title="Cancel download"
        onClick={onCancel}
        icon={<X size={18} />}
      />
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
    <GlassCard as="article" className="mt-6 p-3 sm:p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="aspect-video overflow-hidden rounded-frame bg-black/10 sm:w-60 sm:shrink-0 dark:bg-black/40">
          {video.thumbnailUrl && (
            <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 px-1 pb-1 sm:py-1">
          <h2 className="line-clamp-2 font-semibold tracking-tight" title={video.title}>
            {video.title}
          </h2>
          <div className="flex flex-wrap gap-2">
            <GlassPill tone="accent" className="font-medium">
              {PROVIDER_NAMES[video.provider]}
            </GlassPill>
            {video.durationMs !== null && (
              <GlassPill mono icon={<Clock size={13} />} aria-label="Duration">
                {formatDuration(video.durationMs)}
              </GlassPill>
            )}
          </div>

          {!busy && video.qualities.length > 1 && (
            <div className="flex items-center gap-3">
              <span id="quality-label" className="text-xs font-medium text-fg-subtle">
                Quality
              </span>
              {video.qualities.length <= MAX_SEGMENTED_QUALITIES ? (
                <Segmented
                  aria-label="Quality"
                  size="sm"
                  value={qualityId ?? ''}
                  onChange={setQualityId}
                  options={video.qualities.map((q) => ({ value: q.id, label: q.label }))}
                />
              ) : (
                <select
                  aria-labelledby="quality-label"
                  value={qualityId}
                  onChange={(e) => setQualityId(e.target.value)}
                  className="glass-inset h-8 bg-transparent px-3 text-sm text-fg"
                >
                  {video.qualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        {busy ? (
          <DownloadProgress state={state} onCancel={onCancel} />
        ) : (
          <GlassButton
            variant="primary"
            size="lg"
            onClick={() => onDownload(qualityId)}
            icon={state.status === 'done' ? <RotateCcw size={18} /> : <Download size={18} />}
            className="w-full"
          >
            {state.status === 'done' ? 'Download again' : 'Download'}
          </GlassButton>
        )}

        {state.status === 'done' && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-success">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="truncate">Saved {state.fileName}</span>
          </p>
        )}
      </div>
    </GlassCard>
  )
}

function EmptyState() {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 text-center">
      <span className="glass-pill grid size-14 place-items-center text-accent-text">
        <Sparkles size={24} />
      </span>
      <p className="font-medium">Paste a share link to get started</p>
      <p className="max-w-sm text-sm text-fg-muted">
        Videos are fetched and merged right in your browser — nothing is uploaded anywhere.
      </p>
    </div>
  )
}

export function DownloaderPage() {
  const { state, resolve, download, cancel } = useVideoDownloader()
  const [url, setUrl] = useState('')

  const resolving = state.status === 'resolving'
  const video = 'video' in state ? state.video : null

  useEffect(() => {
    if (state.status === 'done') toast(`Saved ${state.fileName}`, 'success')
  }, [state])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (url.trim()) void resolve(url)
  }

  const pasteFromClipboard = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text) setUrl(text)
    } catch {
      toast('Clipboard access was blocked — paste the link with your keyboard instead.', 'error')
    }
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Video Downloader</h1>
        <p className="mt-3 text-fg-muted">Save Loom videos to your device from a share link.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 sm:mt-10">
        <label htmlFor="video-url" className="sr-only">
          Video link
        </label>
        <GlassInput
          id="video-url"
          size="lg"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          required
          placeholder="https://www.loom.com/share/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          leading={<Link2 size={18} />}
          trailing={
            <>
              <GlassButton
                variant="ghost"
                size="icon"
                aria-label="Paste link from clipboard"
                title="Paste from clipboard"
                onClick={() => void pasteFromClipboard()}
                icon={<ClipboardPaste size={18} />}
              />
              <GlassButton
                type="submit"
                variant="primary"
                disabled={resolving}
                icon={resolving ? <Loader2 size={16} className="animate-spin" /> : undefined}
              >
                {resolving ? 'Fetching' : 'Fetch'}
              </GlassButton>
            </>
          }
        />
      </form>

      <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Supported sites">
        {SUPPORTED.map((s) => (
          <li key={s.name}>
            <GlassPill>
              <span className="font-medium text-fg">{s.name}</span>
              {!s.available && <span className="text-warning">coming soon</span>}
            </GlassPill>
          </li>
        ))}
      </ul>

      {state.status === 'error' && <InlineError className="mt-6">{state.message}</InlineError>}

      {video ? (
        // Remount per video so the quality picker resets to that video's best option.
        <VideoCard
          key={`${video.provider}:${video.id}`}
          video={video}
          state={state}
          onDownload={(qualityId) => void download(video, qualityId)}
          onCancel={cancel}
        />
      ) : (
        state.status !== 'resolving' && <EmptyState />
      )}
    </div>
  )
}
