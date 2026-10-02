import { describe, expect, it } from 'vitest'

import { bubbleRect, positionFromRect, type OverlaySettings } from './overlay'

const base: OverlaySettings = { visible: true, x: 0, y: 0, size: 'md' }

describe('bubbleRect', () => {
  it('keeps the bubble inside the frame at the far corner', () => {
    const r = bubbleRect(1000, 500, { ...base, x: 1, y: 1 })
    expect(r.left + r.size).toBeLessThanOrEqual(1000)
    expect(r.top + r.size).toBeLessThanOrEqual(500)
  })

  it('scales with frame width so preview and recording match', () => {
    const preview = bubbleRect(800, 450, { ...base, x: 0.5, y: 0.5 })
    const video = bubbleRect(1920, 1080, { ...base, x: 0.5, y: 0.5 })
    expect(video.size / 1920).toBeCloseTo(preview.size / 800)
    expect(video.left / 1920).toBeCloseTo(preview.left / 800)
    expect(video.top / 1080).toBeCloseTo(preview.top / 450)
  })
})

describe('positionFromRect', () => {
  it('round-trips with bubbleRect', () => {
    const r = bubbleRect(1280, 720, { ...base, x: 0.3, y: 0.8, size: 'lg' })
    expect(positionFromRect(1280, 720, 'lg', r.left, r.top)).toEqual({
      x: expect.closeTo(0.3) as number,
      y: expect.closeTo(0.8) as number,
    })
  })

  it('clamps positions dragged outside the frame', () => {
    expect(positionFromRect(1280, 720, 'sm', -500, 5000)).toEqual({ x: 0, y: 1 })
  })
})
