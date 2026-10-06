import { describe, expect, it } from 'vitest'

import { TARGET_MAX_ITERATIONS, searchQualityForTarget } from './targetSize'

/** A fake encoder whose output grows linearly with quality: 1000 bytes + 100 per quality point. */
function fakeEncoder(base = 1000, perPoint = 100) {
  const calls: number[] = []
  const encode = async (quality: number) => {
    calls.push(quality)
    return { size: base + quality * perPoint, quality }
  }
  return { encode, calls }
}

describe('searchQualityForTarget', () => {
  it('returns the highest quality that fits', async () => {
    const { encode } = fakeEncoder()
    // size(q) = 1000 + 100q ≤ 5000 → q ≤ 40
    const result = await searchQualityForTarget(encode, 5000)
    expect(result.reached).toBe(true)
    expect(result.quality).toBe(40)
    expect(result.result.size).toBe(5000)
  })

  it('stops after one encode when the top quality already fits', async () => {
    const { encode, calls } = fakeEncoder()
    const result = await searchQualityForTarget(encode, 1_000_000)
    expect(result).toMatchObject({ reached: true, quality: 95, iterations: 1 })
    expect(calls).toEqual([95])
  })

  it('caps the number of encodes', async () => {
    const { encode, calls } = fakeEncoder()
    await searchQualityForTarget(encode, 5050, { maxIterations: 4 })
    expect(calls.length).toBeLessThanOrEqual(4)
    await searchQualityForTarget(encode, 5050)
    expect(calls.length).toBeLessThanOrEqual(4 + TARGET_MAX_ITERATIONS)
  })

  it('reports an unreachable target with the smallest output it found', async () => {
    const { encode, calls } = fakeEncoder()
    const result = await searchQualityForTarget(encode, 500)
    expect(result.reached).toBe(false)
    expect(result.quality).toBe(1)
    expect(result.result.size).toBe(1100)
    expect(calls).toContain(1)
  })

  it('handles encoders whose size is not perfectly monotonic', async () => {
    const encode = async (q: number) => ({ size: q === 50 ? 9999 : q * 10 })
    const result = await searchQualityForTarget(encode, 600, { min: 1, max: 95 })
    expect(result.reached).toBe(true)
    expect(result.result.size).toBeLessThanOrEqual(600)
  })
})
