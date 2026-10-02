import { describe, expect, it } from 'vitest'

import { classifyConversionFailure, ConversionError } from './errors'
import { formatClock, isWebmFile, toMp4FileName } from './files'
import { estimateRemainingMs, parseFfmpegTime, progressRatio } from './progress'

describe('toMp4FileName', () => {
  it('swaps the extension and keeps the base name', () => {
    expect(toMp4FileName('Recording 10-2-2026.webm')).toBe('Recording 10-2-2026.mp4')
    expect(toMp4FileName('clip.final.WEBM')).toBe('clip.final.mp4')
    expect(toMp4FileName('no-extension')).toBe('no-extension.mp4')
  })

  it('never produces an empty or path-like name', () => {
    expect(toMp4FileName('.webm')).toBe('video.mp4')
    expect(toMp4FileName('a/b\\c.webm')).toBe('a-b-c.mp4')
  })
})

describe('isWebmFile', () => {
  it('accepts .webm by extension or MIME type', () => {
    expect(isWebmFile({ name: 'a.webm', type: '' })).toBe(true)
    expect(isWebmFile({ name: 'A.WEBM', type: '' })).toBe(true)
    expect(isWebmFile({ name: 'blob', type: 'video/webm' })).toBe(true)
  })

  it('rejects other files', () => {
    expect(isWebmFile({ name: 'a.mp4', type: 'video/mp4' })).toBe(false)
    expect(isWebmFile({ name: 'webm.txt', type: 'text/plain' })).toBe(false)
  })
})

describe('formatClock', () => {
  it('formats minutes and hours', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65_000)).toBe('1:05')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(-500)).toBe('0:00')
  })
})

describe('progress', () => {
  it('parses ffmpeg status-line times', () => {
    expect(
      parseFfmpegTime('frame=  120 fps= 30 q=28.0 size=     256kB time=00:01:02.50 bitrate='),
    ).toBe(62.5)
    expect(parseFfmpegTime('time=01:00:00.00')).toBe(3600)
    expect(parseFfmpegTime('time=N/A bitrate=N/A')).toBeNull()
    expect(parseFfmpegTime('Input #0, matroska,webm')).toBeNull()
    expect(parseFfmpegTime('time=-00:00:00.03')).toBe(0)
  })

  it('clamps the ratio to [0, 1] and returns null without a duration', () => {
    expect(progressRatio(5, 10)).toBe(0.5)
    expect(progressRatio(12, 10)).toBe(1)
    expect(progressRatio(-1, 10)).toBe(0)
    expect(progressRatio(5, null)).toBeNull()
    expect(progressRatio(5, Infinity)).toBeNull()
    expect(progressRatio(5, 0)).toBeNull()
  })

  it('estimates remaining time only once there is enough signal', () => {
    expect(estimateRemainingMs(10_000, 0.5)).toBe(10_000)
    expect(estimateRemainingMs(1000, 0.01)).toBeNull()
    expect(estimateRemainingMs(1000, null)).toBeNull()
    expect(estimateRemainingMs(1000, 1)).toBeNull()
  })
})

describe('classifyConversionFailure', () => {
  it('detects out-of-memory before decode errors', () => {
    expect(classifyConversionFailure(new Error('RuntimeError: Aborted(OOM)'), []).kind).toBe(
      'memory',
    )
    expect(
      classifyConversionFailure(new RangeError('Array buffer allocation failed'), []).kind,
    ).toBe('memory')
  })

  it('reads corrupt and unsupported input from the logs', () => {
    expect(
      classifyConversionFailure(null, ['input.webm: Invalid data found when processing input'])
        .kind,
    ).toBe('corrupt')
    expect(
      classifyConversionFailure(null, ['Output file #0 does not contain any stream']).kind,
    ).toBe('unsupported')
  })

  it('falls back to unknown and passes ConversionErrors through', () => {
    expect(classifyConversionFailure(new Error('boom'), []).kind).toBe('unknown')
    const original = new ConversionError('load', 'x')
    expect(classifyConversionFailure(original, [])).toBe(original)
  })

  it('does not mistake words containing "oom" for memory errors', () => {
    expect(classifyConversionFailure(null, ['zoom filter', 'room']).kind).toBe('unknown')
  })
})
