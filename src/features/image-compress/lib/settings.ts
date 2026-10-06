import { DEFAULT_FILENAME, type FilenameSettings } from './filename'
import type { FormatChoice } from './formats'
import type { ResizeMode, ResizeSettings } from './resize'

export interface TargetSettings {
  enabled: boolean
  value: number
  unit: 'KB' | 'MB'
}

export interface Settings {
  /** 0–100; lower is a smaller file. */
  quality: number
  format: FormatChoice
  /** Fill colour when transparency is flattened for JPEG. */
  background: string
  resize: ResizeSettings
  stripMetadata: boolean
  filename: FilenameSettings
  target: TargetSettings
  keepFolders: boolean
}

export const DEFAULT_QUALITY = 50
export const QUALITY_PRESETS = [
  { label: 'Low', value: 30 },
  { label: 'Medium', value: 50 },
  { label: 'High', value: 80 },
] as const

export const DEFAULT_SETTINGS: Settings = {
  quality: DEFAULT_QUALITY,
  format: 'original',
  background: '#ffffff',
  resize: { mode: 'off', maxDimension: 1920, scalePercent: 50 },
  stripMetadata: true,
  filename: DEFAULT_FILENAME,
  target: { enabled: false, value: 500, unit: 'KB' },
  keepFolders: true,
}

const FORMATS: FormatChoice[] = ['original', 'jpeg', 'webp', 'avif', 'png']
const RESIZE_MODES: ResizeMode[] = ['off', 'max', 'scale']

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.min(max, Math.max(min, Math.round(v)))
    : fallback
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const str = (v: unknown, fallback: string, maxLength = 60) =>
  typeof v === 'string' ? v.slice(0, maxLength) : fallback
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback

export const clampQuality = (q: number) => Math.min(100, Math.max(0, Math.round(q)))

/** Reads persisted settings defensively: unknown, missing or out-of-range fields get defaults. */
export function parseSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS
  if (!isRecord(raw)) return d
  const resize = isRecord(raw.resize) ? raw.resize : {}
  const filename = isRecord(raw.filename) ? raw.filename : {}
  const target = isRecord(raw.target) ? raw.target : {}
  return {
    quality: num(raw.quality, d.quality, 0, 100),
    format: oneOf(raw.format, FORMATS, d.format),
    background: /^#[0-9a-f]{6}$/i.test(String(raw.background))
      ? String(raw.background)
      : d.background,
    resize: {
      mode: oneOf(resize.mode, RESIZE_MODES, d.resize.mode),
      maxDimension: num(resize.maxDimension, d.resize.maxDimension, 16, 16384),
      scalePercent: num(resize.scalePercent, d.resize.scalePercent, 1, 100),
    },
    stripMetadata: bool(raw.stripMetadata, d.stripMetadata),
    filename: {
      prefix: str(filename.prefix, d.filename.prefix),
      suffix: str(filename.suffix, d.filename.suffix),
      lowercase: bool(filename.lowercase, d.filename.lowercase),
      slugify: bool(filename.slugify, d.filename.slugify),
      numbering: bool(filename.numbering, d.filename.numbering),
    },
    target: {
      enabled: bool(target.enabled, d.target.enabled),
      value: typeof target.value === 'number' && target.value > 0 ? target.value : d.target.value,
      unit: oneOf(target.unit, ['KB', 'MB'] as const, d.target.unit),
    },
    keepFolders: bool(raw.keepFolders, d.keepFolders),
  }
}

/** The settings that change an image's pixels or bytes (not its name or folder). */
export interface EncodeSettings {
  quality: number
  format: FormatChoice
  background: string
  resize: ResizeSettings
  stripMetadata: boolean
  /** Bytes, or null when target-size mode is off. */
  targetBytes: number | null
}

/** A stable key: an image whose result was made with a different key needs re-running. */
export function encodeKey(s: EncodeSettings): string {
  const resize =
    s.resize.mode === 'max'
      ? `max${s.resize.maxDimension}`
      : s.resize.mode === 'scale'
        ? `scale${s.resize.scalePercent}`
        : 'off'
  // Quality is ignored in target-size mode, so changing it there doesn't re-run anything.
  const quality = s.targetBytes !== null ? `t${s.targetBytes}` : `q${s.quality}`
  return [quality, s.format, s.background.toLowerCase(), resize, s.stripMetadata ? 's' : 'k'].join(
    '|',
  )
}

/**
 * PNG has no quality setting; the slider picks a palette size instead (UPNG quantizer).
 * 100 is lossless. Lower values mean fewer colours: 50 → 90 colours, 80+ → 256.
 */
export function pngColors(quality: number): number {
  if (quality >= 100) return 0 // 0 = lossless in UPNG
  return Math.round(Math.min(256, Math.max(16, 2 ** (4 + (4 * quality) / 80))))
}

/** Above this many images, settings changes wait for an explicit "Apply settings". */
export const AUTO_APPLY_LIMIT = 100
export const AUTO_APPLY_DELAY_MS = 500
