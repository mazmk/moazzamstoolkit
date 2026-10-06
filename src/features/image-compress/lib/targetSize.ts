export interface TargetSearchOptions {
  min?: number
  max?: number
  /** Hard cap on encodes per image; each one can take a second or more for large images. */
  maxIterations?: number
}

export interface TargetSearchResult<T> {
  result: T
  quality: number
  /** False when even the lowest quality tried is over the target; `result` is then the smallest. */
  reached: boolean
  iterations: number
}

export const TARGET_MAX_ITERATIONS = 8

/**
 * Finds the highest quality whose output fits in `targetBytes` by binary search over integer
 * qualities. Tries `max` first (small images often fit straight away) and always tries `min` before
 * giving up, so "could not reach target" really means the floor was too big.
 */
export async function searchQualityForTarget<T extends { size: number }>(
  encode: (quality: number) => Promise<T>,
  targetBytes: number,
  { min = 1, max = 95, maxIterations = TARGET_MAX_ITERATIONS }: TargetSearchOptions = {},
): Promise<TargetSearchResult<T>> {
  let iterations = 0
  const tried = new Map<number, T>()
  const run = async (quality: number) => {
    iterations++
    const result = await encode(quality)
    tried.set(quality, result)
    return result
  }

  const top = await run(max)
  if (top.size <= targetBytes) return { result: top, quality: max, reached: true, iterations }

  let best: { result: T; quality: number } | null = null
  let lo = min
  let hi = max - 1
  while (lo <= hi && iterations < maxIterations) {
    const mid = Math.floor((lo + hi) / 2)
    const result = await run(mid)
    if (result.size <= targetBytes) {
      best = { result, quality: mid }
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  if (best) return { ...best, reached: true, iterations }

  // A full search converges on `min` by itself; this only runs when the cap cut it short.
  if (!tried.has(min)) {
    const floor = await run(min)
    if (floor.size <= targetBytes) return { result: floor, quality: min, reached: true, iterations }
  }

  let smallest: { result: T; quality: number } = { result: top, quality: max }
  for (const [quality, result] of tried) {
    if (result.size < smallest.result.size) smallest = { result, quality }
  }
  return { ...smallest, reached: false, iterations }
}
