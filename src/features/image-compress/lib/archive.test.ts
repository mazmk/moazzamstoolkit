import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { isJunkPath, planArchive, splitPath, type ArchiveEntryInfo } from './archive'
import { listZipEntries, readZipEntry } from './zipReader'

const entry = (path: string, size = 100, extra: Partial<ArchiveEntryInfo> = {}) => ({
  path,
  size,
  ...extra,
})

describe('isJunkPath', () => {
  it('flags macOS and Windows metadata', () => {
    expect(isJunkPath('__MACOSX/photos/._a.jpg')).toBe(true)
    expect(isJunkPath('photos/._a.jpg')).toBe(true)
    expect(isJunkPath('photos/.DS_Store')).toBe(true)
    expect(isJunkPath('Thumbs.db')).toBe(true)
    expect(isJunkPath('photos/a.jpg')).toBe(false)
  })
})

describe('planArchive', () => {
  it('keeps images in nested folders and ignores junk, other files and nested archives', () => {
    const plan = planArchive([
      entry('photos/', 0, { directory: true }),
      entry('photos/2024/a.JPG'),
      entry('photos/b.webp'),
      entry('__MACOSX/photos/._a.JPG'),
      entry('.DS_Store'),
      entry('notes.txt'),
      entry('more.zip'),
      entry('more.rar'),
    ])
    expect(plan).toEqual({
      ok: true,
      images: [entry('photos/2024/a.JPG'), entry('photos/b.webp')],
      ignored: 5,
      totalBytes: 200,
    })
  })

  it('enforces the image count and total size limits', () => {
    const limits = { maxImages: 2, maxBytes: 1000 }
    expect(planArchive([entry('a.jpg'), entry('b.jpg'), entry('c.jpg')], limits)).toEqual({
      ok: false,
      error: 'too-many',
    })
    expect(planArchive([entry('a.jpg', 600), entry('b.jpg', 600)], limits)).toEqual({
      ok: false,
      error: 'too-large',
    })
  })

  it('stops reading entries as soon as a limit is crossed', () => {
    let read = 0
    function* lots() {
      for (let i = 0; i < 1_000_000; i++) {
        read++
        yield entry(`${i}.png`, 1024 ** 3)
      }
    }
    expect(planArchive(lots())).toEqual({ ok: false, error: 'too-large' })
    expect(read).toBe(3)
  })

  it('reports encrypted, corrupt and image-less archives', () => {
    expect(planArchive([entry('a.jpg', 10, { encrypted: true })])).toEqual({
      ok: false,
      error: 'encrypted',
    })
    expect(planArchive([entry('a.jpg', -1)])).toEqual({ ok: false, error: 'corrupt' })
    expect(planArchive([entry('readme.md')])).toEqual({ ok: false, error: 'empty' })
  })

  it('splits paths into folder and name', () => {
    expect(splitPath('a/b/c.jpg')).toEqual({ dir: 'a/b', name: 'c.jpg' })
    expect(splitPath('c.jpg')).toEqual({ dir: '', name: 'c.jpg' })
    expect(splitPath('a\\c.jpg')).toEqual({ dir: 'a', name: 'c.jpg' })
  })
})

describe('zipReader', () => {
  const pixels = new Uint8Array(5000).map((_, i) => i % 7)
  const zip = zipSync({
    'photos/': new Uint8Array(0),
    'photos/a.jpg': [pixels, { level: 6 }],
    'photos/ünïcode.png': [strToU8('stored'), { level: 0 }],
  })

  it('lists entries with sizes from the central directory', () => {
    const entries = listZipEntries(zip)
    expect(entries.map((e) => [e.path, e.size, e.directory, e.encrypted])).toEqual([
      ['photos/', 0, true, false],
      ['photos/a.jpg', 5000, false, false],
      ['photos/ünïcode.png', 6, false, false],
    ])
  })

  it('reads deflated and stored entries', () => {
    const [, deflated, stored] = listZipEntries(zip)
    expect(readZipEntry(zip, deflated!)).toEqual(pixels)
    expect(new TextDecoder().decode(readZipEntry(zip, stored!))).toBe('stored')
  })

  it('caps output at the declared size, so a lying header cannot balloon', () => {
    const [, deflated] = listZipEntries(zip)
    expect(readZipEntry(zip, { ...deflated!, size: 10 })).toHaveLength(10)
  })

  it('rejects files that are not ZIPs or are truncated', () => {
    expect(() => listZipEntries(strToU8('definitely not a zip file at all'))).toThrow(/Invalid ZIP/)
    expect(() => listZipEntries(zip.subarray(0, zip.length - 30))).toThrow(/Invalid ZIP/)
  })

  it('refuses encrypted entries', () => {
    const [, deflated] = listZipEntries(zip)
    expect(() => readZipEntry(zip, { ...deflated!, encrypted: true })).toThrow(/Encrypted/)
  })
})
