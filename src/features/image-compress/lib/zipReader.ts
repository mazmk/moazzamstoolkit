import { inflateSync } from 'fflate'

/**
 * A minimal ZIP reader: lists entries from the central directory (with ZIP64 support) so sizes and
 * the encryption flag are known before any data is inflated, then inflates one entry at a time.
 * fflate does the actual decompression.
 */

export interface ZipEntry {
  path: string
  size: number
  compressedSize: number
  method: number
  encrypted: boolean
  directory: boolean
  localHeaderOffset: number
}

export class ZipFormatError extends Error {
  readonly kind: 'corrupt' | 'unsupported'
  constructor(kind: 'corrupt' | 'unsupported', message: string) {
    super(message)
    this.name = 'ZipFormatError'
    this.kind = kind
  }
}

const EOCD = 0x06054b50
const ZIP64_LOCATOR = 0x07064b50
const ZIP64_EOCD = 0x06064b50
const CENTRAL = 0x02014b50
const LOCAL = 0x04034b50
const MAX_COMMENT = 0xffff

const corrupt = (detail: string) => new ZipFormatError('corrupt', `Invalid ZIP: ${detail}`)

function u64(view: DataView, offset: number): number {
  const value = view.getBigUint64(offset, true)
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw corrupt('size out of range')
  return Number(value)
}

function findEocd(view: DataView): number {
  const min = Math.max(0, view.byteLength - 22 - MAX_COMMENT)
  for (let i = view.byteLength - 22; i >= min; i--) {
    if (view.getUint32(i, true) === EOCD) return i
  }
  throw corrupt('end of central directory not found')
}

const utf8 = new TextDecoder('utf-8')

export function listZipEntries(data: Uint8Array): ZipEntry[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (view.byteLength < 22) throw corrupt('file too small')
  const eocd = findEocd(view)
  let count = view.getUint16(eocd + 10, true)
  let cdOffset = view.getUint32(eocd + 16, true)

  if (count === 0xffff || cdOffset === 0xffffffff) {
    const locator = eocd - 20
    if (locator < 0 || view.getUint32(locator, true) !== ZIP64_LOCATOR) {
      throw corrupt('ZIP64 locator missing')
    }
    const zip64 = u64(view, locator + 8)
    if (zip64 + 56 > view.byteLength || view.getUint32(zip64, true) !== ZIP64_EOCD) {
      throw corrupt('ZIP64 record missing')
    }
    count = u64(view, zip64 + 32)
    cdOffset = u64(view, zip64 + 48)
  }

  const entries: ZipEntry[] = []
  let p = cdOffset
  for (let i = 0; i < count; i++) {
    if (p + 46 > view.byteLength || view.getUint32(p, true) !== CENTRAL) {
      throw corrupt('central directory truncated')
    }
    const flags = view.getUint16(p + 8, true)
    const method = view.getUint16(p + 10, true)
    let compressedSize = view.getUint32(p + 20, true)
    let size = view.getUint32(p + 24, true)
    const nameLength = view.getUint16(p + 28, true)
    const extraLength = view.getUint16(p + 30, true)
    const commentLength = view.getUint16(p + 32, true)
    let localHeaderOffset = view.getUint32(p + 42, true)
    const nameStart = p + 46
    if (nameStart + nameLength + extraLength > view.byteLength) throw corrupt('entry truncated')
    const path = utf8.decode(data.subarray(nameStart, nameStart + nameLength))

    // ZIP64 extra field: only the values that overflowed are present, in this order.
    let e = nameStart + nameLength
    const extraEnd = e + extraLength
    while (e + 4 <= extraEnd) {
      const id = view.getUint16(e, true)
      const length = view.getUint16(e + 2, true)
      if (id === 0x0001) {
        let q = e + 4
        const next = () => {
          const value = u64(view, q)
          q += 8
          return value
        }
        if (size === 0xffffffff) size = next()
        if (compressedSize === 0xffffffff) compressedSize = next()
        if (localHeaderOffset === 0xffffffff) localHeaderOffset = next()
      }
      e += 4 + length
    }

    entries.push({
      path,
      size,
      compressedSize,
      method,
      encrypted: (flags & 1) === 1,
      directory: path.endsWith('/'),
      localHeaderOffset,
    })
    p = extraEnd + commentLength
  }
  return entries
}

/** Inflates one entry. Output is capped at the declared size, so a lying header can't balloon. */
export function readZipEntry(data: Uint8Array, entry: ZipEntry): Uint8Array {
  if (entry.encrypted) throw new ZipFormatError('unsupported', 'Encrypted entry')
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const offset = entry.localHeaderOffset
  if (offset + 30 > view.byteLength || view.getUint32(offset, true) !== LOCAL) {
    throw corrupt('local header missing')
  }
  const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true)
  const end = start + entry.compressedSize
  if (end > view.byteLength) throw corrupt('entry data truncated')
  const raw = data.subarray(start, end)
  if (entry.method === 0) return raw.slice()
  if (entry.method === 8) {
    try {
      return inflateSync(raw, { out: new Uint8Array(entry.size) })
    } catch {
      throw corrupt('entry data damaged')
    }
  }
  throw new ZipFormatError('unsupported', `Compression method ${entry.method}`)
}
