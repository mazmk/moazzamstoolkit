import type { Dimensions } from './resize'
import type { InputFormat } from './formats'

/**
 * Reads pixel dimensions and animation from an image's headers without decoding it, so very large
 * or animated images can be skipped before they cost any memory.
 */

const be16 = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!
const le16 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8)
const be32 = (b: Uint8Array, i: number) =>
  ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0
const le24 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16)
const le32 = (b: Uint8Array, i: number) => (le24(b, i) | (b[i + 3]! << 24)) >>> 0
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n))

function jpegSize(b: Uint8Array): Dimensions | null {
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null
    const marker = b[i + 1]!
    if (marker === 0xff) {
      i++
      continue
    }
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: be16(b, i + 5), width: be16(b, i + 7) }
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2
      continue
    }
    i += 2 + be16(b, i + 2)
  }
  return null
}

function webpInfo(b: Uint8Array): { size: Dimensions | null; animated: boolean } {
  const chunk = ascii(b, 12, 4)
  if (chunk === 'VP8X' && b.length >= 30) {
    return {
      animated: (b[20]! & 0x02) !== 0,
      size: { width: le24(b, 24) + 1, height: le24(b, 27) + 1 },
    }
  }
  if (chunk === 'VP8 ' && b.length >= 30) {
    return { animated: false, size: { width: le16(b, 26) & 0x3fff, height: le16(b, 28) & 0x3fff } }
  }
  if (chunk === 'VP8L' && b.length >= 25) {
    const bits = le32(b, 21)
    return {
      animated: false,
      size: { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 },
    }
  }
  return { size: null, animated: false }
}

/** The largest `ispe` (image spatial extents) box: the primary image or its grid, not thumbnails. */
function isobmffSize(b: Uint8Array): Dimensions | null {
  let best: Dimensions | null = null
  for (let i = 4; i + 16 <= b.length; i++) {
    if (b[i] === 0x69 && ascii(b, i, 4) === 'ispe') {
      const size = { width: be32(b, i + 8), height: be32(b, i + 12) }
      if (!best || size.width * size.height > best.width * best.height) best = size
    }
  }
  return best
}

/** True when a PNG has an acTL chunk (APNG) before its image data. */
function isAnimatedPng(b: Uint8Array): boolean {
  let i = 8
  while (i + 8 <= b.length) {
    const type = ascii(b, i + 4, 4)
    if (type === 'acTL') return true
    if (type === 'IDAT' || type === 'IEND') return false
    i += 12 + be32(b, i)
  }
  return false
}

/** Counts image descriptors; more than one frame means animated. Needs the whole file. */
export function isAnimatedGif(b: Uint8Array): boolean {
  if (b.length < 13 || ascii(b, 0, 4) !== 'GIF8') return false
  let i = 13
  if (b[10]! & 0x80) i += 3 * 2 ** ((b[10]! & 0x07) + 1)
  let frames = 0
  const skipSubBlocks = () => {
    while (i < b.length && b[i] !== 0) i += b[i]! + 1
    i++
  }
  while (i < b.length) {
    const block = b[i]
    if (block === 0x3b) break
    if (block === 0x21) {
      i += 2
      skipSubBlocks()
    } else if (block === 0x2c) {
      if (++frames > 1) return true
      const packed = b[i + 9] ?? 0
      i += 10
      if (packed & 0x80) i += 3 * 2 ** ((packed & 0x07) + 1)
      i++ // LZW minimum code size
      skipSubBlocks()
    } else {
      break // malformed; treat what we've seen as final
    }
  }
  return false
}

export interface ImageHeaderInfo {
  size: Dimensions | null
  animated: boolean
}

export function readImageHeader(bytes: Uint8Array, format: InputFormat): ImageHeaderInfo {
  switch (format) {
    case 'jpeg':
      return { size: jpegSize(bytes), animated: false }
    case 'png':
      return {
        size: bytes.length >= 24 ? { width: be32(bytes, 16), height: be32(bytes, 20) } : null,
        animated: isAnimatedPng(bytes),
      }
    case 'gif':
      return {
        size: bytes.length >= 10 ? { width: le16(bytes, 6), height: le16(bytes, 8) } : null,
        animated: isAnimatedGif(bytes),
      }
    case 'webp':
      return webpInfo(bytes)
    case 'bmp':
      return {
        size:
          bytes.length >= 26
            ? { width: Math.abs(le32(bytes, 18) | 0), height: Math.abs(le32(bytes, 22) | 0) }
            : null,
        animated: false,
      }
    case 'avif':
    case 'heic':
      // The meta box sits near the start; don't scan the whole media payload.
      return { size: isobmffSize(bytes.subarray(0, 1 << 20)), animated: false }
  }
}
