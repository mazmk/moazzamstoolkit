/**
 * Lossless metadata handling, used where the tool keeps an original file instead of re-encoding:
 * JPEG, PNG and WebP metadata (EXIF, GPS, XMP, IPTC, comments) is removed without touching pixels.
 * Colour profiles stay, because removing them changes how the image looks.
 */

const be16 = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!
const be32 = (b: Uint8Array, i: number) =>
  ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0
const le32 = (b: Uint8Array, i: number) =>
  (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16) | (b[i + 3]! << 24)) >>> 0
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n))

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

// JPEG -------------------------------------------------------------------------------------------

interface JpegSegment {
  marker: number
  /** The whole segment including FFxx and the length field. */
  bytes: Uint8Array
}

/** Splits a JPEG into its header segments and the entropy-coded rest (from SOS on). */
function splitJpeg(b: Uint8Array): { segments: JpegSegment[]; rest: Uint8Array } | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null
  const segments: JpegSegment[] = []
  let i = 2
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null
    const marker = b[i + 1]!
    if (marker === 0xff) {
      i++
      continue
    }
    if (marker === 0xda || marker === 0xd9) return { segments, rest: b.subarray(i) }
    const length = be16(b, i + 2)
    if (length < 2 || i + 2 + length > b.length) return null
    segments.push({ marker, bytes: b.subarray(i, i + 2 + length) })
    i += 2 + length
  }
  return null
}

const isExif = (s: JpegSegment) => s.marker === 0xe1 && ascii(s.bytes, 4, 6) === 'Exif\0\0'
const isXmp = (s: JpegSegment) =>
  s.marker === 0xe1 && ascii(s.bytes, 4, 29) === 'http://ns.adobe.com/xap/1.0/\0'

/** Finds the Orientation entry (tag 0x0112) in IFD0 of a TIFF block. Returns its byte offset. */
function orientationOffset(tiff: Uint8Array): { offset: number; little: boolean } | null {
  if (tiff.length < 8) return null
  const little = ascii(tiff, 0, 2) === 'II'
  if (!little && ascii(tiff, 0, 2) !== 'MM') return null
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength)
  const ifd = view.getUint32(4, little)
  if (ifd + 2 > tiff.length) return null
  const count = view.getUint16(ifd, little)
  for (let n = 0; n < count; n++) {
    const entry = ifd + 2 + n * 12
    if (entry + 12 > tiff.length) return null
    if (view.getUint16(entry, little) === 0x0112) return { offset: entry + 8, little }
  }
  return null
}

/** EXIF orientation 1–8 (1 = upright). Defaults to 1 when absent or unreadable. */
export function readJpegOrientation(jpeg: Uint8Array): number {
  const parts = splitJpeg(jpeg)
  const exif = parts?.segments.find(isExif)
  if (!exif) return 1
  const tiff = exif.bytes.subarray(10)
  const found = orientationOffset(tiff)
  if (!found) return 1
  const value = new DataView(tiff.buffer, tiff.byteOffset).getUint16(found.offset, found.little)
  return value >= 1 && value <= 8 ? value : 1
}

/** An APP1 segment holding a minimal EXIF block with only the Orientation tag. */
export function orientationSegment(orientation: number): Uint8Array {
  const tiff = [
    0x4d,
    0x4d,
    0,
    42,
    0,
    0,
    0,
    8,
    0,
    1,
    0x01,
    0x12,
    0,
    3,
    0,
    0,
    0,
    1,
    0,
    orientation,
    0,
    0,
    0,
    0,
    0,
    0,
  ]
  const payload = [...'Exif\0\0'].map((c) => c.charCodeAt(0)).concat(tiff)
  const length = payload.length + 2
  return Uint8Array.from([0xff, 0xe1, length >> 8, length & 0xff, ...payload])
}

// APP0 JFIF, APP2 ICC profile and APP14 Adobe (needed to read CMYK correctly) are kept.
const KEEP_MARKERS = new Set([0xe0, 0xe2, 0xee])
const isMetadataMarker = (m: number) =>
  (m >= 0xe1 && m <= 0xef && !KEEP_MARKERS.has(m)) || m === 0xfe

/**
 * Removes EXIF (including GPS), XMP, IPTC and comments from a JPEG without re-encoding. A rotated
 * photo keeps a minimal EXIF block with just its orientation, so it still displays upright.
 */
export function stripJpegMetadata(jpeg: Uint8Array): Uint8Array {
  const parts = splitJpeg(jpeg)
  if (!parts) return jpeg
  const orientation = readJpegOrientation(jpeg)
  const kept = parts.segments.filter((s) => !isMetadataMarker(s.marker)).map((s) => s.bytes)
  const extra = orientation !== 1 ? [orientationSegment(orientation)] : []
  // EXIF must follow JFIF when both are present.
  const jfif = kept.length > 0 && parts.segments[0]?.marker === 0xe0 ? 1 : 0
  return concat([
    jpeg.subarray(0, 2),
    ...kept.slice(0, jfif),
    ...extra,
    ...kept.slice(jfif),
    parts.rest,
  ])
}

/**
 * EXIF and XMP segments of `source`, for copying into a re-encoded JPEG. Orientation is reset to 1
 * because the re-encoded pixels are already upright.
 */
export function copyableJpegMetadata(source: Uint8Array): Uint8Array[] {
  const parts = splitJpeg(source)
  if (!parts) return []
  return parts.segments
    .filter((s) => isExif(s) || isXmp(s))
    .map((s) => {
      const copy = s.bytes.slice()
      if (isExif(s)) {
        const tiff = copy.subarray(10)
        const found = orientationOffset(tiff)
        if (found)
          new DataView(tiff.buffer, tiff.byteOffset).setUint16(found.offset, 1, found.little)
      }
      return copy
    })
}

/** Inserts segments after SOI (and after JFIF, if present). */
export function insertJpegSegments(jpeg: Uint8Array, segments: Uint8Array[]): Uint8Array {
  if (segments.length === 0) return jpeg
  const parts = splitJpeg(jpeg)
  if (!parts) return jpeg
  const at = parts.segments[0]?.marker === 0xe0 ? 2 + parts.segments[0].bytes.length : 2
  return concat([jpeg.subarray(0, at), ...segments, jpeg.subarray(at)])
}

// PNG --------------------------------------------------------------------------------------------

const PNG_METADATA = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'])

/** Drops text, EXIF and timestamp chunks; keeps colour (iCCP, sRGB, gAMA, cHRM) and pixels. */
export function stripPngMetadata(png: Uint8Array): Uint8Array {
  if (png.length < 8 || ascii(png, 1, 3) !== 'PNG') return png
  const parts: Uint8Array[] = [png.subarray(0, 8)]
  let i = 8
  while (i + 12 <= png.length) {
    const length = be32(png, i)
    const end = i + 12 + length
    if (end > png.length) return png
    const type = ascii(png, i + 4, 4)
    if (!PNG_METADATA.has(type)) parts.push(png.subarray(i, end))
    i = end
    if (type === 'IEND') break
  }
  return concat(parts)
}

// WebP -------------------------------------------------------------------------------------------

/** Removes EXIF and XMP chunks from an extended (VP8X) WebP and clears their header flags. */
export function stripWebpMetadata(webp: Uint8Array): Uint8Array {
  if (webp.length < 30 || ascii(webp, 0, 4) !== 'RIFF' || ascii(webp, 8, 4) !== 'WEBP') return webp
  if (ascii(webp, 12, 4) !== 'VP8X') return webp // simple WebPs can't carry metadata
  const chunks: Uint8Array[] = []
  let i = 12
  while (i + 8 <= webp.length) {
    const size = le32(webp, i + 4)
    const end = i + 8 + size + (size & 1)
    if (end > webp.length + 1) return webp
    const type = ascii(webp, i, 4)
    if (type !== 'EXIF' && type !== 'XMP ') chunks.push(webp.slice(i, Math.min(end, webp.length)))
    i = end
  }
  const body = concat(chunks)
  body[8] = body[8]! & ~0x0c // VP8X flags: clear EXIF (0x08) and XMP (0x04)
  const out = new Uint8Array(12 + body.length)
  out.set(webp.subarray(0, 12))
  new DataView(out.buffer).setUint32(4, 4 + body.length, true)
  out.set(body, 12)
  return out
}
