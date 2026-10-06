import { describe, expect, it } from 'vitest'

import { archiveKind, formatFromName, resolveOutputFormat, sniffFormat } from './formats'
import { isAnimatedGif, readImageHeader } from './imageHeader'
import {
  copyableJpegMetadata,
  insertJpegSegments,
  orientationSegment,
  readJpegOrientation,
  stripJpegMetadata,
  stripPngMetadata,
  stripWebpMetadata,
} from './metadata'

const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(
    parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)),
  )
const u16be = (n: number) => [n >> 8, n & 0xff]
const u32be = (n: number) => [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
const u32le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24]

function segment(marker: number, payload: number[] | string) {
  const body = typeof payload === 'string' ? [...payload].map((c) => c.charCodeAt(0)) : payload
  return [0xff, marker, ...u16be(body.length + 2), ...body]
}

/** A JPEG skeleton: SOI, JFIF, given segments, SOF0 (300×200), SOS + data, EOI. */
function jpeg(...segments: number[][]) {
  return bytes(
    [0xff, 0xd8],
    segment(0xe0, 'JFIF\0\x01\x01\0\0\x01\0\x01\0\0'),
    ...segments,
    segment(0xc0, [8, ...u16be(200), ...u16be(300), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]),
    segment(0xda, [3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0]),
    [0x12, 0x34, 0x56, 0xff, 0xd9],
  )
}

const exifWithOrientation = (o: number) => [...orientationSegment(o)]
const gps = segment(0xe1, 'Exif\0\0MM\0*\0\0\0\x08\0\0GPSDATA')
const comment = segment(0xfe, 'shot on my phone')
const icc = segment(0xe2, 'ICC_PROFILE\0\x01\x01data')

describe('formats', () => {
  it('guesses from extension or MIME and spots archives', () => {
    expect(formatFromName('a.JPEG')).toBe('jpeg')
    expect(formatFromName('pasted', 'image/png')).toBe('png')
    expect(formatFromName('IMG.HEIC')).toBe('heic')
    expect(formatFromName('notes.txt', 'text/plain')).toBeNull()
    expect(archiveKind('x.ZIP')).toBe('zip')
    expect(archiveKind('x', 'application/vnd.rar')).toBe('rar')
    expect(archiveKind('x.7z')).toBeNull()
  })

  it('sniffs real formats from magic bytes', () => {
    expect(sniffFormat(jpeg())).toBe('jpeg')
    expect(sniffFormat(bytes('\x89PNG\r\n\x1a\n', u32be(0)))).toBe('png')
    expect(sniffFormat(bytes('RIFF', u32le(4), 'WEBPVP8 '))).toBe('webp')
    expect(sniffFormat(bytes('GIF89a', [0, 0, 0, 0, 0, 0]))).toBe('gif')
    expect(sniffFormat(bytes('BM', new Array(12).fill(0)))).toBe('bmp')
    expect(sniffFormat(bytes(u32be(28), 'ftypavif', u32be(0)))).toBe('avif')
    expect(sniffFormat(bytes(u32be(28), 'ftypheic', u32be(0)))).toBe('heic')
    expect(sniffFormat(bytes('hello world, not an image'))).toBeNull()
  })

  it('maps "keep original" to a format we can write', () => {
    expect(resolveOutputFormat('jpeg', 'original')).toBe('jpeg')
    expect(resolveOutputFormat('bmp', 'original')).toBe('png')
    expect(resolveOutputFormat('gif', 'original')).toBe('png')
    expect(resolveOutputFormat('heic', 'original')).toBe('jpeg')
    expect(resolveOutputFormat('png', 'webp')).toBe('webp')
  })
})

describe('readImageHeader', () => {
  it('reads JPEG, PNG, GIF, BMP and WebP sizes without decoding', () => {
    expect(readImageHeader(jpeg(gps), 'jpeg').size).toEqual({ width: 300, height: 200 })
    const png = bytes(
      '\x89PNG\r\n\x1a\n',
      u32be(13),
      'IHDR',
      u32be(640),
      u32be(480),
      [8, 6, 0, 0, 0],
    )
    expect(readImageHeader(png, 'png')).toEqual({
      size: { width: 640, height: 480 },
      animated: false,
    })
    const gif = bytes('GIF89a', [0x40, 0x01, 0xf0, 0x00, 0, 0, 0], [0x3b])
    expect(readImageHeader(gif, 'gif').size).toEqual({ width: 320, height: 240 })
    const bmp = bytes('BM', new Array(16).fill(0), u32le(100), u32le(-50 >>> 0))
    expect(readImageHeader(bmp, 'bmp').size).toEqual({ width: 100, height: 50 })
    const vp8x = bytes(
      'RIFF',
      u32le(30),
      'WEBPVP8X',
      u32le(10),
      [0x02, 0, 0, 0],
      [0xff, 0x0e, 0],
      [0x37, 0x04, 0],
    )
    expect(readImageHeader(vp8x, 'webp')).toEqual({
      size: { width: 3840, height: 1080 },
      animated: true,
    })
  })

  it('finds the largest ispe box in AVIF/HEIC', () => {
    const avif = bytes(
      u32be(20),
      'ftypavif',
      new Array(8).fill(0),
      u32be(20),
      'ispe',
      u32be(0),
      u32be(256),
      u32be(256),
      u32be(20),
      'ispe',
      u32be(0),
      u32be(4032),
      u32be(3024),
    )
    expect(readImageHeader(avif, 'avif').size).toEqual({ width: 4032, height: 3024 })
  })

  it('detects animated GIFs by counting frames', () => {
    const frame = [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x4c, 0x01, 0]
    const header = bytes('GIF89a', [1, 0, 1, 0, 0, 0, 0])
    const still = new Uint8Array([...header, ...frame, 0x3b])
    const animated = new Uint8Array([
      ...header,
      ...[0x21, 0xff, 0x0b, ...'NETSCAPE2.0'.split('').map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0],
      ...frame,
      ...frame,
      0x3b,
    ])
    expect(isAnimatedGif(still)).toBe(false)
    expect(isAnimatedGif(animated)).toBe(true)
  })

  it('detects APNG', () => {
    const apng = bytes(
      '\x89PNG\r\n\x1a\n',
      u32be(13),
      'IHDR',
      u32be(1),
      u32be(1),
      [8, 6, 0, 0, 0],
      u32be(0),
      u32be(8),
      'acTL',
      u32be(2),
      u32be(0),
      u32be(0),
    )
    expect(readImageHeader(apng, 'png').animated).toBe(true)
  })
})

describe('JPEG metadata', () => {
  it('strips EXIF/GPS and comments but keeps JFIF, ICC and the image data', () => {
    const source = jpeg(gps, comment, icc)
    const stripped = stripJpegMetadata(source)
    const text = String.fromCharCode(...stripped)
    expect(text).not.toContain('GPSDATA')
    expect(text).not.toContain('shot on my phone')
    expect(text).toContain('ICC_PROFILE')
    expect(text).toContain('JFIF')
    expect([...stripped.slice(-5)]).toEqual([0x12, 0x34, 0x56, 0xff, 0xd9])
    expect(readImageHeader(stripped, 'jpeg').size).toEqual({ width: 300, height: 200 })
  })

  it('keeps a rotated photo upright with a minimal orientation-only EXIF', () => {
    const source = jpeg(exifWithOrientation(6), comment)
    expect(readJpegOrientation(source)).toBe(6)
    const stripped = stripJpegMetadata(source)
    expect(readJpegOrientation(stripped)).toBe(6)
    expect(stripped.length).toBeLessThan(source.length)
  })

  it('copies EXIF into a re-encoded JPEG with orientation reset to 1', () => {
    const source = jpeg(exifWithOrientation(8))
    const copied = copyableJpegMetadata(source)
    expect(copied).toHaveLength(1)
    const output = insertJpegSegments(jpeg(), copied)
    expect(readJpegOrientation(output)).toBe(1)
    expect(String.fromCharCode(...output)).toContain('Exif')
    // The source isn't modified.
    expect(readJpegOrientation(source)).toBe(8)
  })

  it('leaves non-JPEG input untouched', () => {
    const junk = bytes('not a jpeg')
    expect(stripJpegMetadata(junk)).toBe(junk)
  })
})

describe('PNG and WebP metadata', () => {
  const chunk = (type: string, data: string) => [
    ...u32be(data.length),
    ...bytes(type, data),
    0,
    0,
    0,
    0,
  ]

  it('removes PNG text and EXIF chunks, keeping colour chunks', () => {
    const png = bytes(
      '\x89PNG\r\n\x1a\n',
      chunk('IHDR', '0123456789abc'),
      chunk('iCCP', 'profile'),
      chunk('tEXt', 'Author\0Me'),
      chunk('eXIf', 'MM\0*GPS'),
      chunk('IDAT', 'pixels'),
      chunk('IEND', ''),
    )
    const text = String.fromCharCode(...stripPngMetadata(png))
    expect(text).toContain('iCCP')
    expect(text).toContain('IDAT')
    expect(text).not.toContain('tEXt')
    expect(text).not.toContain('eXIf')
  })

  it('removes WebP EXIF/XMP chunks and clears the flags', () => {
    const chunkLe = (type: string, data: string) => [
      ...bytes(type),
      ...u32le(data.length),
      ...bytes(data),
      ...(data.length % 2 ? [0] : []),
    ]
    const body = [
      ...chunkLe('VP8X', '\x0c\0\0\0\0\0\0\0\0\0'),
      ...chunkLe('VP8 ', 'pixels'),
      ...chunkLe('EXIF', 'GPSDATA'),
      ...chunkLe('XMP ', '<x/>'),
    ]
    const webp = bytes('RIFF', u32le(4 + body.length), 'WEBP', body)
    const out = stripWebpMetadata(webp)
    const text = String.fromCharCode(...out)
    expect(text).not.toContain('GPSDATA')
    expect(text).not.toContain('XMP ')
    expect(out[20]! & 0x0c).toBe(0)
    expect(new DataView(out.buffer).getUint32(4, true)).toBe(out.length - 8)
  })
})
