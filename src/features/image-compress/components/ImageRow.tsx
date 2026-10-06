import { ArrowRight, Columns2, Download, ImageIcon, X } from 'lucide-react'
import { memo, useId } from 'react'

import { Button } from '@/shared/ui/Button'

import { isOutdated, useBatchStore, type BatchItem } from '../hooks/useBatchStore'
import { formatBytes, savingsPercent } from '../lib/bytes'
import { FORMAT_LABEL } from '../lib/formats'
import { isFinished } from '../lib/types'
import { StatusChip, statusLabel } from './StatusChip'

interface ImageRowProps {
  item: BatchItem
  selected: boolean
  outputPath: string | undefined
  onDownload: (item: BatchItem) => void
}

const dims = (d: { width: number; height: number }) => `${d.width}×${d.height}`

function QualityOverride({ item }: { item: BatchItem }) {
  const setQualityOverride = useBatchStore((s) => s.setQualityOverride)
  const id = useId()
  if (item.status === 'skipped') return null
  if (item.applied.target.enabled) {
    return <span className="font-mono text-xs text-muted">Quality auto</span>
  }
  const overridden = item.qualityOverride !== null
  return (
    <div className="flex items-center gap-1.5">
      <label
        htmlFor={id}
        title="Quality for this image (overrides the batch)"
        className="font-mono text-xs text-muted"
      >
        Q
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={100}
        step={1}
        aria-label={`Quality for ${item.name}`}
        value={item.qualityOverride ?? item.applied.quality}
        onChange={(e) => {
          const n = e.target.valueAsNumber
          if (Number.isFinite(n) && n >= 0 && n <= 100) setQualityOverride(item.id, n)
        }}
        className={`h-7 w-14 rounded-[8px] border bg-surface px-1.5 font-mono text-xs tabular-nums ${
          overridden ? 'border-ink text-ink' : 'border-line text-muted'
        }`}
      />
      {overridden && (
        <button
          type="button"
          onClick={() => setQualityOverride(item.id, null)}
          className="rounded-[6px] px-1 text-xs text-accent-text underline-offset-2 hover:underline"
        >
          Reset to batch
        </button>
      )}
    </div>
  )
}

/** One image: thumbnail, name, sizes, savings, status and actions. Memoized; 2,000 rows add up. */
export const ImageRow = memo(function ImageRow({
  item,
  selected,
  outputPath,
  onDownload,
}: ImageRowProps) {
  const select = useBatchStore((s) => s.select)
  const removeItems = useBatchStore((s) => s.removeItems)
  const setCompare = useBatchStore((s) => s.setCompare)
  const result = item.result
  const finished = isFinished(item) && result
  const saved = result ? savingsPercent(item.size, result.blob.size) : null
  const origin = item.source.kind === 'archive' ? `from ${item.source.archive}` : null
  const location = [origin, item.dir].filter(Boolean).join(' · ')
  const outdated = isOutdated(item) && item.status !== 'queued' && item.status !== 'processing'

  return (
    <li
      className={`grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-line px-3 py-3 last:border-b-0 sm:px-4 lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] ${
        selected ? 'bg-surface-2' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => select([item.id], 'toggle')}
        aria-label={`Select ${item.name}`}
        className="mt-4 size-4 cursor-pointer accent-ink"
      />
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-line bg-surface-2">
        {item.thumbUrl ? (
          <img src={item.thumbUrl} alt="" className="size-full object-cover" decoding="async" />
        ) : (
          <ImageIcon size={18} className="text-muted" aria-hidden />
        )}
      </div>

      <div className="min-w-0">
        <p
          className="truncate text-sm font-medium"
          title={[item.dir, item.name].filter(Boolean).join('/')}
        >
          {item.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-xs text-muted tabular-nums">
          {item.sourceSize ? <span>{dims(item.sourceSize)}</span> : null}
          {result && item.sourceSize && dims(result.size) !== dims(item.sourceSize) && (
            <>
              <ArrowRight size={11} aria-label="to" />
              <span>{dims(result.size)}</span>
            </>
          )}
          <span>
            {FORMAT_LABEL[item.format]}
            {result && result.format !== item.format && ` → ${FORMAT_LABEL[result.format]}`}
          </span>
          {location && <span className="truncate">· {location}</span>}
        </p>
        {item.message && item.message !== statusLabel(item) && (
          <p
            className={`mt-1 text-xs ${
              item.status === 'failed'
                ? 'text-danger'
                : item.status === 'skipped'
                  ? 'text-warning'
                  : 'text-muted'
            }`}
          >
            {item.message}
          </p>
        )}
        {outdated && (
          <p className="mt-1 text-xs text-muted">Settings changed since this was compressed.</p>
        )}
        {outputPath && finished && (
          <p className="mt-1 truncate font-mono text-[11px] text-muted" title={outputPath}>
            → {outputPath}
          </p>
        )}
      </div>

      <div className="col-span-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pl-7 sm:pl-[4.75rem] lg:col-span-1 lg:justify-end lg:pl-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-mono text-xs whitespace-nowrap tabular-nums">
            {formatBytes(item.size)}
            {result && (
              <>
                {' → '}
                <span className="text-ink">{formatBytes(result.blob.size)}</span>
              </>
            )}
          </span>
          {saved !== null && (
            <span
              className={`font-mono text-xs font-medium tabular-nums ${saved > 0 ? 'text-success' : 'text-muted'}`}
            >
              {saved > 0 ? `−${saved}%` : saved < 0 ? `+${-saved}%` : '0%'}
            </span>
          )}
          <StatusChip item={item} />
          <QualityOverride item={item} />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Compare before and after: ${item.name}`}
            title="Compare"
            disabled={!result}
            onClick={() => setCompare(item.id)}
            icon={<Columns2 size={16} />}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Download ${item.name}`}
            title="Download"
            disabled={!result}
            onClick={() => onDownload(item)}
            icon={<Download size={16} />}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${item.name}`}
            title="Remove"
            onClick={() => removeItems([item.id])}
            icon={<X size={16} />}
          />
        </div>
      </div>
    </li>
  )
})
