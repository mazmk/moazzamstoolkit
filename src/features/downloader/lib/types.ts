import type { DashRepresentation } from './dash'
import type { Provider } from './providers'

export interface VideoQuality {
  id: string
  label: string
}

export type VideoSource =
  | { kind: 'file'; url: string; extension: 'mp4' | 'webm' }
  | { kind: 'dash'; videos: DashRepresentation[]; audio: DashRepresentation | null }

export interface ResolvedVideo {
  provider: Provider
  id: string
  title: string
  thumbnailUrl: string | null
  durationMs: number | null
  source: VideoSource
  /** Selectable qualities, best first. Empty when there is only one file. */
  qualities: VideoQuality[]
}

export type DownloadPhase = 'downloading' | 'merging'

export interface DownloadOptions {
  qualityId?: string
  signal?: AbortSignal
  onBytes?: (bytes: number) => void
  /** Expected total size in bytes — exact for single files, estimated from bitrate for streams. */
  onTotal?: (bytes: number) => void
  onPhase?: (phase: DownloadPhase) => void
}
