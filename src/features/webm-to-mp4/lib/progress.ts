/**
 * ffmpeg's status lines contain `time=HH:MM:SS.ss` for the position written so far. That's more
 * reliable than ffmpeg.wasm's own progress event for variable-frame-rate browser recordings.
 * Returns seconds, or null for lines without a usable time (e.g. `time=N/A`).
 */
export function parseFfmpegTime(line: string): number | null {
  const match = /time=\s*(-?)(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(line)
  if (!match) return null
  if (match[1] === '-') return 0
  return Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4])
}

/** Fraction done in [0, 1], or null when the duration is unknown. Never negative or over 100%. */
export function progressRatio(positionSec: number, durationSec: number | null): number | null {
  if (!durationSec || !Number.isFinite(durationSec) || durationSec <= 0) return null
  return Math.min(1, Math.max(0, positionSec / durationSec))
}

/** Rough time remaining from a linear extrapolation. Null until there's enough signal. */
export function estimateRemainingMs(elapsedMs: number, ratio: number | null): number | null {
  if (ratio === null || ratio < 0.02 || ratio >= 1) return null
  return Math.max(0, (elapsedMs * (1 - ratio)) / ratio)
}
