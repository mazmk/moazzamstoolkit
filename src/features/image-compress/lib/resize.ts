export interface Dimensions {
  width: number
  height: number
}

export type ResizeMode = 'off' | 'max' | 'scale'

export interface ResizeSettings {
  mode: ResizeMode
  /** Longest side in px, for `max`. */
  maxDimension: number
  /** 1–100, for `scale`. */
  scalePercent: number
}

export const MAX_DIMENSION_PRESETS = [3840, 2560, 1920, 1280, 800] as const

/**
 * Output size for a resize setting. Never upscales and keeps the aspect ratio; each side is at
 * least 1px. Returns the source size unchanged when no resize applies.
 */
export function targetDimensions(source: Dimensions, resize: ResizeSettings): Dimensions {
  const { width, height } = source
  let scale = 1
  if (resize.mode === 'max' && resize.maxDimension > 0) {
    scale = resize.maxDimension / Math.max(width, height)
  } else if (resize.mode === 'scale' && resize.scalePercent > 0) {
    scale = resize.scalePercent / 100
  }
  if (!(scale < 1)) return { width, height }
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Fits an image inside a box (for thumbnails); never upscales. */
export function fitWithin(source: Dimensions, box: number): Dimensions {
  return targetDimensions(source, { mode: 'max', maxDimension: box, scalePercent: 100 })
}
