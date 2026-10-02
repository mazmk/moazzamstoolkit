export type BubbleSize = 'sm' | 'md' | 'lg'

// Bubble diameter as a fraction of the frame width.
export const BUBBLE_SIZES: Record<BubbleSize, number> = { sm: 0.14, md: 0.2, lg: 0.28 }

export interface OverlaySettings {
  visible: boolean
  // Position within the free space of the frame: 0 = left/top edge, 1 = right/bottom edge.
  // Normalising against the free space keeps the bubble inside the frame at any size or aspect ratio.
  x: number
  y: number
  size: BubbleSize
}

const MARGIN = 0.02 // fraction of frame width kept clear around the bubble

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function metrics(width: number, height: number, size: BubbleSize) {
  const margin = MARGIN * width
  const diameter = Math.max(0, Math.min(BUBBLE_SIZES[size] * width, height - 2 * margin))
  return {
    margin,
    diameter,
    rangeX: Math.max(0, width - diameter - 2 * margin),
    rangeY: Math.max(0, height - diameter - 2 * margin),
  }
}

/** Pixel rect of the bubble inside a frame of the given size. Shared by the DOM preview and the canvas compositor. */
export function bubbleRect(width: number, height: number, overlay: OverlaySettings) {
  const { margin, diameter, rangeX, rangeY } = metrics(width, height, overlay.size)
  return {
    left: margin + clamp01(overlay.x) * rangeX,
    top: margin + clamp01(overlay.y) * rangeY,
    size: diameter,
  }
}

/** Inverse of bubbleRect: converts a pixel position (e.g. from a drag) back to normalised x/y. */
export function positionFromRect(
  width: number,
  height: number,
  size: BubbleSize,
  left: number,
  top: number,
): Pick<OverlaySettings, 'x' | 'y'> {
  const { margin, rangeX, rangeY } = metrics(width, height, size)
  return {
    x: rangeX > 0 ? clamp01((left - margin) / rangeX) : 0,
    y: rangeY > 0 ? clamp01((top - margin) / rangeY) : 0,
  }
}
