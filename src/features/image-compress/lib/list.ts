import { savingsPercent } from './bytes'
import { isFinished, type ImageItem, type ItemStatus } from './types'

export type SortKey = 'added' | 'name' | 'size' | 'saved'
export type SortDirection = 'asc' | 'desc'
export type StatusFilter = 'all' | 'done' | 'failed' | 'skipped' | 'optimized' | 'target-missed'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'added', label: 'Order added' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Original size' },
  { value: 'saved', label: 'Saved %' },
]

export const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'done', label: 'Compressed' },
  { value: 'optimized', label: 'Already optimized' },
  { value: 'target-missed', label: 'Missed target' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'failed', label: 'Failed' },
]

type ListItem = Pick<ImageItem, 'name' | 'dir' | 'size' | 'status'> & {
  result: { blob: { size: number } } | null
}

/** Saved % for a finished item, or null while it has no result. */
export function itemSavings(item: ListItem): number | null {
  return item.result && isFinished(item) ? savingsPercent(item.size, item.result.blob.size) : null
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Stable sort; "added" keeps list order. Items without a saved % sort last either way. */
export function sortItems<T extends ListItem>(
  items: T[],
  key: SortKey,
  direction: SortDirection,
): T[] {
  if (key === 'added') return direction === 'asc' ? items : [...items].reverse()
  const sign = direction === 'asc' ? 1 : -1
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      let diff: number
      if (key === 'name') {
        diff = collator.compare(`${a.item.dir}/${a.item.name}`, `${b.item.dir}/${b.item.name}`)
      } else if (key === 'size') {
        diff = a.item.size - b.item.size
      } else {
        const sa = itemSavings(a.item)
        const sb = itemSavings(b.item)
        if (sa === null || sb === null) return sa === sb ? a.index - b.index : sa === null ? 1 : -1
        diff = sa - sb
      }
      return diff * sign || a.index - b.index
    })
    .map(({ item }) => item)
}

const FILTERS: Record<Exclude<StatusFilter, 'all'>, ItemStatus[]> = {
  done: ['done'],
  failed: ['failed'],
  skipped: ['skipped'],
  optimized: ['optimized'],
  'target-missed': ['target-missed'],
}

export function filterItems<T extends ListItem>(items: T[], filter: StatusFilter): T[] {
  if (filter === 'all') return items
  const statuses = FILTERS[filter]
  return items.filter((item) => statuses.includes(item.status))
}

export interface BatchSummary {
  total: number
  finished: number
  originalBytes: number
  outputBytes: number
  savedPercent: number
}

/** Totals over finished images, so the before/after comparison is like for like. */
export function summarize(items: ListItem[]): BatchSummary {
  let finished = 0
  let originalBytes = 0
  let outputBytes = 0
  for (const item of items) {
    if (!item.result || !isFinished(item)) continue
    finished++
    originalBytes += item.size
    outputBytes += item.result.blob.size
  }
  return {
    total: items.length,
    finished,
    originalBytes,
    outputBytes,
    savedPercent: savingsPercent(originalBytes, outputBytes),
  }
}
