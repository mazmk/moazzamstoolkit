import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'

import { Button } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import { Segmented } from '@/shared/ui/Segmented'

import { useBatchStore } from '../hooks/useBatchStore'
import { formatBytes, formatSavings } from '../lib/bytes'
import { FORMAT_LABEL } from '../lib/formats'

/** Points an <img> at an object URL for `blob`, revoked when the element or blob goes away. */
function useBlobSrc(blob: Blob | null) {
  return useCallback(
    (el: HTMLImageElement | null) => {
      if (!el || !blob) return
      const url = URL.createObjectURL(blob)
      el.src = url
      return () => {
        el.removeAttribute('src')
        URL.revokeObjectURL(url)
      }
    },
    [blob],
  )
}

type Zoom = 'fit' | 'actual'

/**
 * Before/after comparison: the compressed image over the original, clipped at a draggable divider.
 * The divider is a real range input, so it works with arrow keys too. "100%" shows the output's
 * actual pixel size (the original is scaled to match when the image was resized).
 */
export function CompareDialog() {
  const compareId = useBatchStore((s) => s.compareId)
  const item = useBatchStore((s) => s.items.find((i) => i.id === s.compareId) ?? null)
  const setCompare = useBatchStore((s) => s.setCompare)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [split, setSplit] = useState(50)
  const [zoom, setZoom] = useState<Zoom>('fit')
  const [dragging, setDragging] = useState(false)
  const [originalFailed, setOriginalFailed] = useState(false)
  const [shownId, setShownId] = useState<string | null>(null)
  const open = item !== null && item.result !== null

  // Reset per image (adjust-state-during-render, not an effect).
  if (compareId !== shownId) {
    setShownId(compareId)
    setSplit(50)
    setOriginalFailed(false)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  const originalRef = useBlobSrc(item?.file ?? null)
  const resultRef = useBlobSrc(item?.result?.blob ?? null)

  const moveTo = (clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    setSplit(Math.round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))))
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    moveTo(e.clientX)
  }

  const result = item?.result
  const size = result?.size
  const close = () => setCompare(null)

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="compare-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-5xl overflow-visible bg-transparent p-0 text-ink backdrop:bg-scrim"
    >
      {item && result && size && (
        <Panel className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="compare-title" className="truncate text-base font-semibold tracking-tight">
                {item.name}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-muted tabular-nums">
                Original {formatBytes(item.size)} ({FORMAT_LABEL[item.format]}) · Compressed{' '}
                {formatBytes(result.blob.size)} ({FORMAT_LABEL[result.format]}) ·{' '}
                <span className="text-ink">{formatSavings(item.size, result.blob.size)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Segmented<Zoom>
                aria-label="Zoom"
                size="sm"
                value={zoom}
                onChange={setZoom}
                options={[
                  { value: 'fit', label: 'Fit' },
                  { value: 'actual', label: '100%' },
                ]}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close comparison"
                onClick={close}
                icon={<X size={16} />}
              />
            </div>
          </div>

          <div
            className={`min-h-0 rounded-control border border-line bg-surface-2 ${zoom === 'actual' ? 'overflow-auto' : 'overflow-hidden'}`}
          >
            <div
              ref={stageRef}
              onPointerDown={onPointerDown}
              onPointerMove={(e) => dragging && moveTo(e.clientX)}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              className="relative mx-auto cursor-ew-resize touch-none select-none"
              style={
                zoom === 'actual'
                  ? { width: size.width, height: size.height }
                  : {
                      aspectRatio: `${size.width} / ${size.height}`,
                      maxHeight: '65dvh',
                      maxWidth: '100%',
                    }
              }
            >
              {originalFailed ? (
                <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">
                  This browser can’t display the original {FORMAT_LABEL[item.format]}.
                </div>
              ) : (
                <img
                  ref={originalRef}
                  alt={`Original: ${item.name}`}
                  onError={() => setOriginalFailed(true)}
                  draggable={false}
                  className="absolute inset-0 size-full object-contain"
                />
              )}
              <img
                ref={resultRef}
                alt={`Compressed: ${item.name}`}
                draggable={false}
                className="absolute inset-0 size-full object-contain"
                style={{ clipPath: `inset(0 0 0 ${split}%)` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent"
                style={{ left: `${split}%` }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute top-2 left-2 rounded-full bg-surface px-2 py-0.5 font-mono text-[11px] tracking-[0.06em] uppercase"
              >
                Before
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute top-2 right-2 rounded-full bg-surface px-2 py-0.5 font-mono text-[11px] tracking-[0.06em] uppercase"
              >
                After
              </span>
            </div>
          </div>

          <label className="flex items-center gap-3 text-xs text-muted">
            <span className="shrink-0">Divider</span>
            <input
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-valuetext={`${split}% original, ${100 - split}% compressed`}
              className="h-6 w-full cursor-pointer accent-accent"
            />
          </label>
        </Panel>
      )}
    </dialog>
  )
}
