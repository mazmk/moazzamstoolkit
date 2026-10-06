import { describe, expect, it } from 'vitest'

import { filterItems, sortItems, summarize } from './list'
import {
  DEFAULT_SETTINGS,
  encodeKey,
  parseSettings,
  pngColors,
  type EncodeSettings,
} from './settings'
import type { ItemStatus } from './types'

describe('parseSettings', () => {
  it('falls back to defaults for missing or invalid data', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('nope')).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.quality).toBe(50)
    expect(DEFAULT_SETTINGS.stripMetadata).toBe(true)
    expect(DEFAULT_SETTINGS.filename.suffix).toBe('-compressed')
  })

  it('clamps and validates each field', () => {
    const parsed = parseSettings({
      quality: 140,
      format: 'tiff',
      background: 'red',
      resize: { mode: 'max', maxDimension: 2560.4, scalePercent: 0 },
      stripMetadata: false,
      filename: { prefix: 'x'.repeat(500), numbering: true },
      target: { enabled: true, value: -3, unit: 'GB' },
    })
    expect(parsed.quality).toBe(100)
    expect(parsed.format).toBe('original')
    expect(parsed.background).toBe('#ffffff')
    expect(parsed.resize).toEqual({ mode: 'max', maxDimension: 2560, scalePercent: 1 })
    expect(parsed.stripMetadata).toBe(false)
    expect(parsed.filename.prefix).toHaveLength(60)
    expect(parsed.filename.numbering).toBe(true)
    expect(parsed.filename.suffix).toBe('-compressed')
    expect(parsed.target).toEqual({ enabled: true, value: 500, unit: 'KB' })
  })
})

describe('encodeKey', () => {
  const base: EncodeSettings = {
    quality: 50,
    format: 'original',
    background: '#FFFFFF',
    resize: { mode: 'off', maxDimension: 1920, scalePercent: 50 },
    stripMetadata: true,
    targetBytes: null,
  }

  it('changes when anything that affects the output changes', () => {
    const key = encodeKey(base)
    expect(encodeKey({ ...base, quality: 51 })).not.toBe(key)
    expect(encodeKey({ ...base, format: 'webp' })).not.toBe(key)
    expect(encodeKey({ ...base, stripMetadata: false })).not.toBe(key)
    expect(encodeKey({ ...base, resize: { ...base.resize, mode: 'max' } })).not.toBe(key)
  })

  it('ignores inactive resize values and quality in target mode', () => {
    expect(encodeKey({ ...base, resize: { ...base.resize, maxDimension: 800 } })).toBe(
      encodeKey(base),
    )
    const target = { ...base, targetBytes: 100_000 }
    expect(encodeKey({ ...target, quality: 90 })).toBe(encodeKey(target))
    expect(encodeKey({ ...base, background: '#ffffff' })).toBe(encodeKey(base))
  })
})

describe('pngColors', () => {
  it('maps the slider to a palette size; 100 is lossless', () => {
    expect(pngColors(100)).toBe(0)
    expect(pngColors(80)).toBe(256)
    expect(pngColors(0)).toBe(16)
    expect(pngColors(50)).toBeGreaterThan(64)
    expect(pngColors(50)).toBeLessThan(128)
  })
})

describe('list helpers', () => {
  const item = (name: string, size: number, status: ItemStatus, output?: number) => ({
    name,
    dir: '',
    size,
    status,
    result: output === undefined ? null : { blob: { size: output } },
  })
  const items = [
    item('b10.jpg', 1000, 'done', 250),
    item('b2.jpg', 4000, 'done', 3000),
    item('a.png', 2000, 'failed'),
    item('c.gif', 500, 'skipped'),
    item('d.jpg', 800, 'optimized', 800),
  ]

  it('sorts by name naturally, size and saved %, with unfinished items last', () => {
    expect(sortItems(items, 'name', 'asc').map((i) => i.name)).toEqual([
      'a.png',
      'b2.jpg',
      'b10.jpg',
      'c.gif',
      'd.jpg',
    ])
    expect(sortItems(items, 'size', 'desc').map((i) => i.size)).toEqual([
      4000, 2000, 1000, 800, 500,
    ])
    expect(sortItems(items, 'saved', 'desc').map((i) => i.name)).toEqual([
      'b10.jpg',
      'b2.jpg',
      'd.jpg',
      'a.png',
      'c.gif',
    ])
    expect(sortItems(items, 'added', 'desc')[0]!.name).toBe('d.jpg')
  })

  it('filters by status', () => {
    expect(filterItems(items, 'failed').map((i) => i.name)).toEqual(['a.png'])
    expect(filterItems(items, 'optimized').map((i) => i.name)).toEqual(['d.jpg'])
    expect(filterItems(items, 'all')).toBe(items)
  })

  it('summarizes finished images only', () => {
    expect(summarize(items)).toEqual({
      total: 5,
      finished: 3,
      originalBytes: 5800,
      outputBytes: 4050,
      savedPercent: 30,
    })
  })
})
