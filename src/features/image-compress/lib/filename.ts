export interface FilenameSettings {
  prefix: string
  suffix: string
  lowercase: boolean
  slugify: boolean
  /** Appends -01, -02, … in list order. */
  numbering: boolean
}

export const DEFAULT_FILENAME: FilenameSettings = {
  prefix: '',
  suffix: '-compressed',
  lowercase: false,
  slugify: false,
  numbering: false,
}

const MAX_SEGMENT = 180
// Characters that are invalid in a file name on Windows, macOS or inside a ZIP path.
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\u0000-\u001f\u007f<>:"/\\|?*]+/g
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i

export function splitName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? { base: name.slice(0, dot), ext: name.slice(dot + 1) } : { base: name, ext: '' }
}

/** Makes one path segment safe on every OS: no separators, control or reserved characters. */
export function sanitizeSegment(segment: string): string {
  let s = segment.normalize('NFC').replace(UNSAFE, '-').replace(/\s+/g, ' ')
  s = s.replace(/^[\s.]+|[\s.]+$/g, '').slice(0, MAX_SEGMENT)
  return RESERVED.test(s) ? `_${s}` : s
}

/** "Café Photo (1)" → "cafe-photo-1". */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * The output file name for one image: prefix + base + suffix (+ number) + the extension of the
 * output format. `index` is the image's position in the list, used only when numbering is on.
 */
export function buildOutputName(
  originalName: string,
  extension: string,
  settings: FilenameSettings,
  index = 0,
  total = 1,
): string {
  const { base } = splitName(originalName)
  const number = settings.numbering
    ? `-${String(index + 1).padStart(Math.max(2, String(total).length), '0')}`
    : ''
  let stem = `${settings.prefix}${base}${settings.suffix}${number}`
  if (settings.slugify) stem = slugify(stem)
  else if (settings.lowercase) stem = stem.toLowerCase()
  return `${sanitizeSegment(stem) || 'image'}.${extension.toLowerCase()}`
}

/** "a/b\\c" → ["a", "b", "c"], each sanitised, with empty, "." and ".." segments dropped. */
export function safeDirSegments(dir: string): string[] {
  return dir
    .split(/[\\/]+/)
    .filter((s) => s !== '' && s !== '.' && s !== '..')
    .map(sanitizeSegment)
    .filter(Boolean)
}

export function joinPath(dir: string, name: string): string {
  const segments = safeDirSegments(dir)
  return segments.length ? `${segments.join('/')}/${name}` : name
}

/**
 * Makes every path unique (case-insensitively, since macOS and Windows are), keeping the first one
 * as is: "a.jpg", "a.jpg" → "a.jpg", "a-2.jpg". Never lets one output overwrite another.
 */
export function uniquePaths(paths: string[]): string[] {
  const taken = new Set<string>()
  return paths.map((path) => {
    const slash = path.lastIndexOf('/')
    const dir = path.slice(0, slash + 1)
    const { base, ext } = splitName(path.slice(slash + 1))
    let candidate = path
    for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
      candidate = `${dir}${base}-${n}${ext ? `.${ext}` : ''}`
    }
    taken.add(candidate.toLowerCase())
    return candidate
  })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** compressed-images-20261006-1430.zip, in local time. */
export function zipFileName(date = new Date()): string {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  return `compressed-images-${day}-${pad(date.getHours())}${pad(date.getMinutes())}.zip`
}
