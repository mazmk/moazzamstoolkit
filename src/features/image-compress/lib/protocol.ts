import type { ArchiveErrorKind } from './archive'
import type { InputFormat, OutputFormat } from './formats'
import type { Dimensions } from './resize'
import type { EncodeSettings } from './settings'

// Compress worker ------------------------------------------------------------------------------

export interface CompressRequest {
  jobId: number
  file: Blob
  name: string
  format: InputFormat
  settings: EncodeSettings
  /** Ask for a small preview; only the first run of each image needs one. */
  wantThumb: boolean
}

export type CompressOutcome =
  | {
      kind: 'result'
      blob: Blob
      format: OutputFormat
      inputFormat: InputFormat
      size: Dimensions
      sourceSize: Dimensions
      quality: number | null
      keptOriginal: boolean
      targetReached: boolean
      thumb: Blob | null
      /** Set when a codec failed to load and the browser's own encoder was used. */
      usedFallback: boolean
    }
  | {
      kind: 'skipped'
      reason: string
      inputFormat: InputFormat | null
      sourceSize: Dimensions | null
      thumb: Blob | null
    }

export type CompressResponse =
  | { jobId: number; type: 'progress'; value: number }
  | { jobId: number; type: 'done'; outcome: CompressOutcome }
  | { jobId: number; type: 'error'; message: string }

// Archive worker -------------------------------------------------------------------------------

export interface ArchiveRequest {
  file: Blob
  name: string
  kind: 'zip' | 'rar'
  /** URL of unrar.wasm, resolved by the page so Vite fingerprints it. */
  unrarWasmUrl?: string
}

export interface ExtractedEntry {
  path: string
  data: Uint8Array<ArrayBuffer>
}

export type ArchiveResponse =
  | { type: 'planned'; total: number; ignored: number; totalBytes: number }
  | { type: 'entries'; entries: ExtractedEntry[]; done: number }
  | { type: 'finished' }
  | { type: 'error'; error: ArchiveErrorKind }

// ZIP builder worker ---------------------------------------------------------------------------

export interface ZipRequest {
  files: { path: string; blob: Blob }[]
}

export type ZipResponse =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; blob: Blob }
  | { type: 'error'; message: string }
