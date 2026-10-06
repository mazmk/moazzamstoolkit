/** Image formats the compressor reads. HEIC is decoded only where the browser supports it. */
export type InputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'bmp' | 'gif' | 'heic'
/** Formats it can write. */
export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif'
export type FormatChoice = 'original' | OutputFormat
export type ArchiveKind = 'zip' | 'rar'

export const OUTPUT_EXTENSION: Record<OutputFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
}

export const OUTPUT_MIME: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}

export const INPUT_MIME: Record<InputFormat, string> = {
  ...OUTPUT_MIME,
  bmp: 'image/bmp',
  gif: 'image/gif',
  heic: 'image/heic',
}

export const FORMAT_LABEL: Record<InputFormat, string> = {
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
  bmp: 'BMP',
  gif: 'GIF',
  heic: 'HEIC',
}

const BY_EXTENSION: Record<string, InputFormat> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jpe: 'jpeg',
  jfif: 'jpeg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  bmp: 'bmp',
  dib: 'bmp',
  gif: 'gif',
  heic: 'heic',
  heif: 'heic',
}

const BY_MIME: Record<string, InputFormat> = {
  'image/jpeg': 'jpeg',
  'image/pjpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/x-ms-bmp': 'bmp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heic',
}

/** Accept attribute for the file picker: images plus the archives we unpack. */
export const ACCEPT = [
  ...Object.keys(BY_EXTENSION).map((ext) => `.${ext}`),
  ...Object.keys(BY_MIME),
  '.zip',
  '.rar',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
].join(',')

export function extensionOf(name: string): string {
  const base = name.slice(name.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
}

/** A first guess from the name and MIME type; the worker confirms it from the file's bytes. */
export function formatFromName(name: string, mime = ''): InputFormat | null {
  return BY_EXTENSION[extensionOf(name)] ?? BY_MIME[mime.toLowerCase()] ?? null
}

export function archiveKind(name: string, mime = ''): ArchiveKind | null {
  const ext = extensionOf(name)
  if (ext === 'zip' || mime === 'application/zip' || mime === 'application/x-zip-compressed') {
    return 'zip'
  }
  if (ext === 'rar' || mime === 'application/vnd.rar' || mime === 'application/x-rar-compressed') {
    return 'rar'
  }
  return null
}

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length))

/** Identifies an image from its first bytes, so a renamed or mislabelled file is still read right. */
export function sniffFormat(bytes: Uint8Array): InputFormat | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  if (ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n') return 'png'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp'
  if (ascii(bytes, 0, 4) === 'GIF8') return 'gif'
  if (ascii(bytes, 0, 2) === 'BM') return 'bmp'
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4)
    if (brand === 'avif' || brand === 'avis') return 'avif'
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) {
      return 'heic'
    }
  }
  return null
}

/** What "Keep original" writes: formats we can't encode become the closest one we can. */
export function resolveOutputFormat(input: InputFormat, choice: FormatChoice): OutputFormat {
  if (choice !== 'original') return choice
  switch (input) {
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'avif':
      return input
    case 'heic':
      return 'jpeg'
    case 'bmp':
    case 'gif':
      return 'png'
  }
}

/** Formats whose encoder has a real quality setting. PNG maps quality to a colour palette. */
export const isLossy = (format: OutputFormat) => format !== 'png'
