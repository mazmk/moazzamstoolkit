import { AlertTriangle, Download, FolderDown, Loader2, Play, X } from 'lucide-react'

import { Button } from '@/shared/ui/Button'
import { ProgressBar } from '@/shared/ui/ProgressBar'

import { desiredKey, useBatchStore } from '../hooks/useBatchStore'
import { useExport } from '../hooks/useExport'
import { formatBytes } from '../lib/bytes'
import { summarize } from '../lib/list'
import { LARGE_DOWNLOAD_BYTES, canSaveToFolder } from '../lib/saveFiles'

const plural = (n: number) => `${n} image${n === 1 ? '' : 's'}`

export function SummaryBar({ onCancel }: { onCancel: () => void }) {
  const items = useBatchStore((s) => s.items)
  const paused = useBatchStore((s) => s.paused)
  const archives = useBatchStore((s) => s.archives)
  const setPaused = useBatchStore((s) => s.setPaused)
  const { downloadZip, saveFolder, progress } = useExport()

  const summary = summarize(items)
  let active = 0
  let settled = 0
  let partial = 0
  let pending = 0
  for (const item of items) {
    if (item.status === 'queued' || item.status === 'processing') {
      active++
      partial += item.progress
    } else {
      settled++
      if (item.status !== 'skipped' && item.attemptKey !== desiredKey(item)) pending++
    }
  }
  const running = active > 0
  const ratio = items.length ? (settled + partial) / items.length : 0
  const withResults = items.filter((i) => i.result).length
  const big = summary.outputBytes > LARGE_DOWNLOAD_BYTES
  const status = running
    ? `Compressing… ${settled} of ${plural(items.length)} done`
    : paused && pending
      ? `Cancelled. ${plural(pending)} not compressed.`
      : `${plural(items.length)} processed`

  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm tabular-nums">
            {plural(summary.total)}
            {summary.finished > 0 && (
              <>
                {' · '}
                {formatBytes(summary.originalBytes)} → {formatBytes(summary.outputBytes)}
                {' · '}
                <span className={summary.savedPercent > 0 ? 'text-success' : 'text-muted'}>
                  {summary.savedPercent >= 0
                    ? `saved ${summary.savedPercent}%`
                    : `${-summary.savedPercent}% larger`}
                </span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-muted" aria-live="polite">
            {status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {running && (
            <Button variant="secondary" size="sm" icon={<X size={14} />} onClick={onCancel}>
              Cancel
            </Button>
          )}
          {!running && paused && pending > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Play size={14} />}
              onClick={() => setPaused(false)}
            >
              Resume
            </Button>
          )}
          {canSaveToFolder() && (
            <Button
              variant={big ? 'primary' : 'secondary'}
              size="sm"
              icon={<FolderDown size={14} />}
              disabled={withResults === 0 || progress !== null}
              onClick={() => void saveFolder()}
            >
              Save to folder
            </Button>
          )}
          <Button
            variant={big && canSaveToFolder() ? 'secondary' : 'primary'}
            size="sm"
            icon={<Download size={14} />}
            disabled={withResults === 0 || progress !== null}
            onClick={() => void downloadZip()}
          >
            Download all (ZIP)
          </Button>
        </div>
      </div>

      {running && (
        <ProgressBar value={ratio} label="Overall progress" valueText={status} showPercent />
      )}

      {archives.map((a) => (
        <div key={a.id} className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-xs">
            <Loader2 size={13} className="text-accent motion-safe:animate-spin" aria-hidden />
            Unpacking {a.name}
            <span className="font-mono text-muted tabular-nums">
              {a.total === null ? 'reading…' : `${a.done} / ${a.total}`}
            </span>
          </p>
          <ProgressBar
            value={a.total ? a.done / a.total : null}
            label={`Unpacking ${a.name}`}
            valueText={a.total ? `${a.done} of ${a.total} images extracted` : 'Reading archive'}
          />
        </div>
      ))}

      {progress && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <p className="text-xs">
            {progress.label}…{' '}
            <span className="font-mono text-muted tabular-nums">
              {progress.done} / {progress.total}
            </span>
          </p>
          <ProgressBar
            value={progress.total ? progress.done / progress.total : null}
            label={progress.label}
          />
        </div>
      )}

      {big && (
        <p className="flex items-start gap-2 text-xs text-warning">
          <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
          {canSaveToFolder()
            ? `Over 1 GB of images. “Save to folder” is faster and uses far less memory than a ZIP.`
            : `Over 1 GB of images. Building the ZIP needs that much memory; download in smaller selections if it fails.`}
        </p>
      )}
    </div>
  )
}
