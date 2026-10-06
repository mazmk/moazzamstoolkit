import type { InputFormat, OutputFormat } from './formats'
import type { Dimensions } from './resize'

export type ItemStatus =
  | 'queued'
  | 'processing'
  | 'done'
  /** The compressed file was larger, so the original was kept. */
  | 'optimized'
  | 'target-missed'
  | 'skipped'
  | 'failed'
  | 'cancelled'

export type ItemSource =
  { kind: 'file' } | { kind: 'folder' } | { kind: 'archive'; archive: string }

export interface ItemResult {
  /** The status this result earned, restored if a later re-run is cancelled. */
  status: 'done' | 'optimized' | 'target-missed'
  blob: Blob
  /** encodeKey() of the settings that produced it. */
  key: string
  format: OutputFormat
  size: Dimensions
  /** Quality used, when the format has one (target-size mode picks its own). */
  quality: number | null
  keptOriginal: boolean
  targetReached: boolean
}

export interface ImageItem {
  id: string
  file: Blob
  /** Original file name, without folders. */
  name: string
  /** Folder inside the dropped folder or archive; "" for loose files. */
  dir: string
  source: ItemSource
  size: number
  format: InputFormat
  qualityOverride: number | null
  status: ItemStatus
  /** 0–1 while processing (target-size mode makes several passes). */
  progress: number
  /** Why it was skipped or failed. */
  message: string | null
  sourceSize: Dimensions | null
  thumbUrl: string | null
  result: ItemResult | null
}

export const FINISHED: ReadonlySet<ItemStatus> = new Set(['done', 'optimized', 'target-missed'])
export const isFinished = (item: Pick<ImageItem, 'status'>) => FINISHED.has(item.status)
