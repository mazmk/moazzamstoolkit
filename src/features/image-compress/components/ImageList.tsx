import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CheckSquare,
  ChevronDown,
  Download,
  FolderDown,
  RefreshCw,
  SlidersHorizontal,
  Square,
  ToggleLeft,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Button } from '@/shared/ui/Button'
import { Menu } from '@/shared/ui/Menu'

import { useBatchStore } from '../hooks/useBatchStore'
import { useExport } from '../hooks/useExport'
import { FILTER_OPTIONS, SORT_OPTIONS, filterItems, sortItems } from '../lib/list'
import { canSaveToFolder } from '../lib/saveFiles'
import { ImageRow } from './ImageRow'

const PAGE = 200

const selectClass =
  'h-8 rounded-control border border-line bg-surface px-2 text-[13px] text-ink transition-colors duration-150 ease-out hover:bg-surface-2'

export function ImageList() {
  const items = useBatchStore((s) => s.items)
  const selected = useBatchStore((s) => s.selected)
  const sort = useBatchStore((s) => s.sort)
  const sortDirection = useBatchStore((s) => s.sortDirection)
  const filter = useBatchStore((s) => s.filter)
  const autoApply = useBatchStore((s) => s.autoApply)
  const { select, setView, removeItems, clear, retryFailed, applySettings } =
    useBatchStore.getState()
  const { paths, downloadOne, downloadZip, saveFolder, progress } = useExport()
  const [limit, setLimit] = useState(PAGE)
  // A stable callback keeps memoized rows from re-rendering whenever any path changes.
  const downloadRef = useRef(downloadOne)
  useEffect(() => {
    downloadRef.current = downloadOne
  })
  const onDownload = useCallback(
    (item: Parameters<typeof downloadOne>[0]) => downloadRef.current(item),
    [],
  )
  const [confirmClear, setConfirmClear] = useState(false)

  const visible = useMemo(
    () => sortItems(filterItems(items, filter), sort, sortDirection),
    [items, filter, sort, sortDirection],
  )
  const failed = items.filter((i) => i.status === 'failed').length
  const selectedCount = selected.size
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.id))
  const someSelected = selectedCount > 0 && !allVisibleSelected
  const selectedWithResults = items.filter((i) => selected.has(i.id) && i.result).length
  const ids = (list: typeof items) => list.map((i) => i.id)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="checkbox"
            aria-label="Select all shown images"
            checked={allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected
            }}
            onChange={() => select(ids(visible), allVisibleSelected ? 'remove' : 'add')}
            className="size-4 cursor-pointer accent-ink"
          />
          <span className="font-mono text-xs text-muted tabular-nums" aria-live="polite">
            {selectedCount ? `${selectedCount} selected` : `${visible.length} shown`}
          </span>
          <Menu
            label="Batch actions"
            width={280}
            groups={[
              {
                label: 'Select',
                items: [
                  {
                    id: 'all',
                    label: 'Select all',
                    icon: <CheckSquare size={16} />,
                    onSelect: () => select(ids(visible), 'add'),
                  },
                  {
                    id: 'none',
                    label: 'Select none',
                    icon: <Square size={16} />,
                    onSelect: () => select([], 'set'),
                  },
                  {
                    id: 'invert',
                    label: 'Invert selection',
                    icon: <ToggleLeft size={16} />,
                    onSelect: () => select(ids(visible), 'toggle'),
                  },
                ],
              },
              {
                label: 'Selected',
                items: [
                  {
                    id: 'download',
                    label: 'Download selected',
                    icon: <Download size={16} />,
                    disabled: selectedWithResults === 0 || progress !== null,
                    hint: selectedWithResults > 1 ? 'ZIP' : undefined,
                    onSelect: () => void downloadZip(selected),
                  },
                  ...(canSaveToFolder()
                    ? [
                        {
                          id: 'save',
                          label: 'Save selected to folder',
                          icon: <FolderDown size={16} />,
                          disabled: selectedWithResults === 0 || progress !== null,
                          onSelect: () => void saveFolder(selected),
                        },
                      ]
                    : []),
                  {
                    id: 'apply',
                    label: 'Apply settings to selected',
                    icon: <SlidersHorizontal size={16} />,
                    description: autoApply ? 'Turn off “Apply automatically” first' : undefined,
                    disabled: selectedCount === 0 || autoApply,
                    onSelect: () => applySettings(selected),
                  },
                  {
                    id: 'remove',
                    label: 'Remove selected',
                    icon: <Trash2 size={16} />,
                    disabled: selectedCount === 0,
                    onSelect: () => removeItems(selected),
                  },
                ],
              },
              {
                items: [
                  {
                    id: 'retry',
                    label: 'Retry failed',
                    icon: <RefreshCw size={16} />,
                    hint: failed ? String(failed) : undefined,
                    disabled: failed === 0,
                    onSelect: retryFailed,
                  },
                  {
                    id: 'clear',
                    label: 'Clear all',
                    icon: <X size={16} />,
                    onSelect: () => setConfirmClear(true),
                  },
                ],
              },
            ]}
            trigger={(props) => (
              <Button {...props} variant="secondary" size="sm">
                Actions
                <ChevronDown size={14} aria-hidden />
              </Button>
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor="image-sort">
            Sort by
          </label>
          <select
            id="image-sort"
            value={sort}
            onChange={(e) => {
              const next = SORT_OPTIONS.find((o) => o.value === e.target.value)
              if (next) setView({ sort: next.value })
            }}
            className={selectClass}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              sortDirection === 'asc'
                ? 'Sorted ascending; switch to descending'
                : 'Sorted descending; switch to ascending'
            }
            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            onClick={() => setView({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' })}
            icon={
              sortDirection === 'asc' ? (
                <ArrowUpNarrowWide size={16} />
              ) : (
                <ArrowDownWideNarrow size={16} />
              )
            }
          />
          <label className="sr-only" htmlFor="image-filter">
            Show
          </label>
          <select
            id="image-filter"
            value={filter}
            onChange={(e) => {
              const next = FILTER_OPTIONS.find((o) => o.value === e.target.value)
              if (next) setView({ filter: next.value })
              setLimit(PAGE)
            }}
            className={selectClass}
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">No images match this filter.</p>
      ) : (
        <ul aria-label="Images">
          {visible.slice(0, limit).map((item) => (
            <ImageRow
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              outputPath={paths.get(item.id)}
              onDownload={onDownload}
            />
          ))}
        </ul>
      )}
      {visible.length > limit && (
        <div className="border-t border-line p-3 text-center">
          <Button variant="secondary" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
            Show {Math.min(PAGE, visible.length - limit)} more of {visible.length - limit}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear all images?"
        description="This removes every image and result from the list. Your settings are kept."
        confirmLabel="Clear all"
        tone="danger"
        onConfirm={() => {
          setConfirmClear(false)
          clear()
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
