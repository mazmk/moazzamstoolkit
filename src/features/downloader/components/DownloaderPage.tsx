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
import { useEffect, useState, type FormEvent } from 'react'

import { formatBytes, formatDuration } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import { TextField } from '@/shared/ui/TextField'
import { Tag } from '@/shared/ui/Tag'
import { InlineError } from '@/shared/ui/InlineError'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ProgressBar } from '@/shared/ui/ProgressBar'
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

/** Bytes downloaded, a flat 6px bar with a mono percentage, and Cancel. */
function DownloadProgress({ state, onCancel }: { state: DownloaderState; onCancel: () => void }) {
  if (state.status !== 'downloading') return null
  const merging = state.phase === 'merging'
  // Stream totals are estimated from bitrate, so cap below 100% until the file is actually done.
  const fraction = merging ? 1 : state.total ? Math.min(0.99, state.loaded / state.total) : null
  const detail = merging
    ? 'Merging audio and video…'
    : `${formatBytes(state.loaded)}${state.total ? ` of ~${formatBytes(state.total)}` : ''}`

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted tabular-nums">{detail}</span>
        <Button variant="secondary" size="sm" onClick={onCancel} icon={<X size={14} />}>
          Cancel
        </Button>
      </div>
      <ProgressBar
        value={merging ? null : fraction}
        label="Download progress"
        valueText={detail}
        showPercent
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
    <Panel as="article" className="mt-6 p-3 sm:p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="aspect-video overflow-hidden rounded-control border border-line bg-surface-2 sm:w-60 sm:shrink-0">
          {video.thumbnailUrl && (
            <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 px-1 pb-1 sm:py-1">
          <h2 className="line-clamp-2 text-[17px] font-medium tracking-tight" title={video.title}>
            {video.title}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Tag tone="accent">{PROVIDER_NAMES[video.provider]}</Tag>
            {video.durationMs !== null && (
              <Tag mono icon={<Clock size={13} />} aria-label="Duration">
                {formatDuration(video.durationMs)}
              </Tag>
            )}
          </div>

          {!busy && video.qualities.length > 1 && (
            <div className="flex items-center gap-3">
              <span
                id="quality-label"
                className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase"
              >
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
                  className="h-8 rounded-control border border-line bg-surface px-2.5 text-sm text-ink"
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
          <Button
            variant="primary"
            size="lg"
            onClick={() => onDownload(qualityId)}
            icon={state.status === 'done' ? <RotateCcw size={18} /> : <Download size={18} />}
            className="w-full"
          >
            {state.status === 'done' ? 'Download again' : 'Download'}
          </Button>
        )}

        {state.status === 'done' && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="truncate">Saved {state.fileName}</span>
          </p>
        )}
      </div>
    </Panel>
  )
}

function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-start gap-2 border-t border-line pt-6">
      <Sparkles size={20} className="text-accent" aria-hidden />
      <p className="mt-1 font-medium">Paste a share link to get started</p>
      <p className="max-w-sm text-sm text-muted">
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
      <PageHeader
        toolId="video-downloader"
        title="Video Downloader"
        description="Save Loom videos to your device from a share link."
      />

      <form onSubmit={handleSubmit}>
        <label htmlFor="video-url" className="sr-only">
          Video link
        </label>
        <TextField
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
              <Button
                variant="ghost"
                size="icon"
                aria-label="Paste link from clipboard"
                title="Paste from clipboard"
                onClick={() => void pasteFromClipboard()}
                icon={<ClipboardPaste size={18} />}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={resolving}
                icon={resolving ? <Loader2 size={16} className="animate-spin" /> : undefined}
              >
                {resolving ? 'Fetching' : 'Fetch'}
              </Button>
            </>
          }
        />
      </form>

      <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Supported sites">
        {SUPPORTED.map((s) => (
          <li key={s.name}>
            <Tag tone={s.available ? 'ink' : 'muted'}>
              {s.name}
              {!s.available && <span className="text-warning">coming soon</span>}
            </Tag>
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
