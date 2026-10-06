import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FILENAME,
  buildOutputName,
  joinPath,
  sanitizeSegment,
  slugify,
  uniquePaths,
  zipFileName,
} from './filename'

const opts = (over: Partial<typeof DEFAULT_FILENAME> = {}) => ({ ...DEFAULT_FILENAME, ...over })

describe('buildOutputName', () => {
  it('adds the default suffix and keeps the extension for the same format', () => {
    expect(buildOutputName('holiday.jpg', 'jpg', opts())).toBe('holiday-compressed.jpg')
  })

  it('swaps the extension when the format changes', () => {
    expect(buildOutputName('scan.PNG', 'webp', opts())).toBe('scan-compressed.webp')
    expect(buildOutputName('photo.jpeg', 'avif', opts({ suffix: '' }))).toBe('photo.avif')
    expect(buildOutputName('IMG_1.HEIC', 'JPG', opts({ suffix: '' }))).toBe('IMG_1.jpg')
  })

  it('keeps dots inside the base name', () => {
    expect(buildOutputName('v1.2.final.png', 'png', opts({ suffix: '' }))).toBe('v1.2.final.png')
    expect(buildOutputName('no-extension', 'jpg', opts({ suffix: '' }))).toBe('no-extension.jpg')
  })

  it('applies prefix, lowercase and slugify', () => {
    expect(buildOutputName('My Photo.JPG', 'jpg', opts({ prefix: 'web-', lowercase: true }))).toBe(
      'web-my photo-compressed.jpg',
    )
    expect(buildOutputName('Café Photo (1).jpg', 'jpg', opts({ slugify: true }))).toBe(
      'cafe-photo-1-compressed.jpg',
    )
  })

  it('numbers images with a width that fits the batch', () => {
    expect(buildOutputName('a.jpg', 'jpg', opts({ numbering: true }), 0, 5)).toBe(
      'a-compressed-01.jpg',
    )
    expect(buildOutputName('a.jpg', 'jpg', opts({ numbering: true }), 41, 120)).toBe(
      'a-compressed-042.jpg',
    )
  })

  it('never returns an unsafe or empty name', () => {
    expect(buildOutputName('a/b:c?.jpg', 'jpg', opts({ suffix: '' }))).toBe('a-b-c-.jpg')
    expect(buildOutputName('....jpg', 'jpg', opts({ suffix: '' }))).toBe('image.jpg')
    expect(buildOutputName('###.jpg', 'jpg', opts({ suffix: '', slugify: true }))).toBe('image.jpg')
  })
})

describe('sanitizeSegment and slugify', () => {
  it('removes control and reserved characters, and trailing dots', () => {
    expect(sanitizeSegment('a\u0000b<c>d|e.')).toBe('a-b-c-d-e')
    expect(sanitizeSegment('  name  ')).toBe('name')
    expect(sanitizeSegment('CON')).toBe('_CON')
    expect(sanitizeSegment('x'.repeat(300))).toHaveLength(180)
  })

  it('slugifies accents and symbols', () => {
    expect(slugify('Ñandú — Über!')).toBe('nandu-uber')
  })
})

describe('paths', () => {
  it('joins folders safely, dropping traversal segments', () => {
    expect(joinPath('photos/2024', 'a.jpg')).toBe('photos/2024/a.jpg')
    expect(joinPath('../../etc', 'a.jpg')).toBe('etc/a.jpg')
    expect(joinPath('', 'a.jpg')).toBe('a.jpg')
    expect(joinPath('a\\b', 'c.jpg')).toBe('a/b/c.jpg')
  })

  it('never lets duplicates overwrite each other, case-insensitively', () => {
    expect(uniquePaths(['a.jpg', 'A.jpg', 'a.jpg', 'b/a.jpg', 'a-2.jpg'])).toEqual([
      'a.jpg',
      'A-2.jpg',
      'a-3.jpg',
      'b/a.jpg',
      'a-2-2.jpg',
    ])
  })

  it('names the ZIP with a local timestamp', () => {
    expect(zipFileName(new Date(2026, 9, 6, 9, 5))).toBe('compressed-images-20261006-0905.zip')
  })
})
