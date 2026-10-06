import { describe, expect, it } from 'vitest'

import { fitWithin, targetDimensions, type ResizeSettings } from './resize'

const max = (maxDimension: number): ResizeSettings => ({
  mode: 'max',
  maxDimension,
  scalePercent: 100,
})
const scale = (scalePercent: number): ResizeSettings => ({
  mode: 'scale',
  maxDimension: 0,
  scalePercent,
})

describe('targetDimensions', () => {
  it('leaves the size alone when resizing is off', () => {
    expect(targetDimensions({ width: 4000, height: 3000 }, { ...max(800), mode: 'off' })).toEqual({
      width: 4000,
      height: 3000,
    })
  })

  it('fits the longest side and keeps the aspect ratio', () => {
    expect(targetDimensions({ width: 4000, height: 3000 }, max(1920))).toEqual({
      width: 1920,
      height: 1440,
    })
    expect(targetDimensions({ width: 3000, height: 4000 }, max(1920))).toEqual({
      width: 1440,
      height: 1920,
    })
  })

  it('never upscales', () => {
    expect(targetDimensions({ width: 800, height: 600 }, max(1920))).toEqual({
      width: 800,
      height: 600,
    })
    expect(targetDimensions({ width: 800, height: 600 }, scale(150))).toEqual({
      width: 800,
      height: 600,
    })
    expect(targetDimensions({ width: 1920, height: 1080 }, max(1920))).toEqual({
      width: 1920,
      height: 1080,
    })
  })

  it('scales by percent, keeping at least 1px per side', () => {
    expect(targetDimensions({ width: 1000, height: 500 }, scale(50))).toEqual({
      width: 500,
      height: 250,
    })
    expect(targetDimensions({ width: 1000, height: 1 }, scale(10))).toEqual({
      width: 100,
      height: 1,
    })
  })

  it('fits thumbnails in a box', () => {
    expect(fitWithin({ width: 4000, height: 1000 }, 160)).toEqual({ width: 160, height: 40 })
  })
})
