import { describe, expect, it } from 'vitest'

import {
  buildFfmpegArgs,
  isResolutionAvailable,
  outputDimensions,
  scaleFilter,
  type BuildArgsOptions,
} from './args'

const landscape = { width: 1920, height: 1080 }
const portrait = { width: 1080, height: 1920 }
const odd = { width: 1279, height: 721 }

const base: BuildArgsOptions = {
  input: 'input.webm',
  output: 'output.mp4',
  resolution: 'original',
  compression: 'balanced',
  source: landscape,
}

const valueAfter = (args: string[], flag: string) => args[args.indexOf(flag) + 1]

describe('buildFfmpegArgs', () => {
  it('produces the documented command shape', () => {
    expect(buildFfmpegArgs(base)).toEqual([
      '-i',
      'input.webm',
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-vf',
      'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-r',
      '30',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      'output.mp4',
    ])
  })

  it('maps compression presets to CRF 28 / 23 / 18', () => {
    expect(valueAfter(buildFfmpegArgs({ ...base, compression: 'small' }), '-crf')).toBe('28')
    expect(valueAfter(buildFfmpegArgs({ ...base, compression: 'balanced' }), '-crf')).toBe('23')
    expect(valueAfter(buildFfmpegArgs({ ...base, compression: 'best' }), '-crf')).toBe('18')
  })

  it('maps audio optionally so inputs without an audio track still convert', () => {
    expect(buildFfmpegArgs(base)).toContain('0:a?')
  })

  it('keeps input first and output last', () => {
    const args = buildFfmpegArgs({ ...base, resolution: '720' })
    expect(args.slice(0, 2)).toEqual(['-i', 'input.webm'])
    expect(args.at(-1)).toBe('output.mp4')
  })
})

describe('scaleFilter', () => {
  it('downscales landscape by height with an even, auto width', () => {
    expect(scaleFilter('720', landscape)).toBe('scale=-2:720')
    expect(scaleFilter('480', landscape)).toBe('scale=-2:480')
  })

  it('treats portrait targets as the short side', () => {
    expect(scaleFilter('720', portrait)).toBe('scale=720:-2')
  })

  it('forces even dimensions when keeping the original size', () => {
    expect(scaleFilter('original', odd)).toBe('scale=trunc(iw/2)*2:trunc(ih/2)*2')
  })

  it('never upscales: a target at or above the source keeps the original size', () => {
    expect(scaleFilter('1080', landscape)).toBe('scale=trunc(iw/2)*2:trunc(ih/2)*2')
    expect(scaleFilter('1080', { width: 1280, height: 720 })).toBe(
      'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    )
  })
})

describe('isResolutionAvailable', () => {
  it('disables options larger than the source', () => {
    const hd = { width: 1280, height: 720 }
    expect(isResolutionAvailable('original', hd)).toBe(true)
    expect(isResolutionAvailable('1080', hd)).toBe(false)
    expect(isResolutionAvailable('720', hd)).toBe(true)
    expect(isResolutionAvailable('480', hd)).toBe(true)
  })

  it('compares against the short side for portrait video', () => {
    expect(isResolutionAvailable('1080', portrait)).toBe(true)
    expect(isResolutionAvailable('1080', { width: 720, height: 1280 })).toBe(false)
  })

  it('allows everything when dimensions are unknown', () => {
    expect(isResolutionAvailable('1080', null)).toBe(true)
  })
})

describe('outputDimensions', () => {
  it('keeps the aspect ratio and rounds to even numbers', () => {
    expect(outputDimensions('720', landscape)).toEqual({ width: 1280, height: 720 })
    expect(outputDimensions('480', { width: 1366, height: 768 })).toEqual({
      width: 852,
      height: 480,
    })
    expect(outputDimensions('original', odd)).toEqual({ width: 1278, height: 720 })
    expect(outputDimensions('720', portrait)).toEqual({ width: 720, height: 1280 })
  })
})
