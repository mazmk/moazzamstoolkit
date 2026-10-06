import { archiveKind, formatFromName } from './formats'

/** Zip-bomb and memory guards, checked against declared sizes before anything is unpacked. */
export const MAX_ARCHIVE_IMAGES = 2000
export const MAX_ARCHIVE_BYTES = 2 * 1024 ** 3

export interface ArchiveLimits {
  maxImages: number
  maxBytes: number
}

export const ARCHIVE_LIMITS: ArchiveLimits = {
  maxImages: MAX_ARCHIVE_IMAGES,
  maxBytes: MAX_ARCHIVE_BYTES,
}

export interface ArchiveEntryInfo {
  path: string
  /** Declared uncompressed size. */
  size: number
  directory?: boolean
  encrypted?: boolean
}

export type ArchiveErrorKind =
  'encrypted' | 'corrupt' | 'too-many' | 'too-large' | 'empty' | 'unsupported' | 'memory'

export function archiveErrorMessage(kind: ArchiveErrorKind, archiveName: string): string {
  switch (kind) {
    case 'encrypted':
      return `“${archiveName}” is password-protected. Extract it on your computer, then add the images.`
    case 'corrupt':
      return `“${archiveName}” looks damaged or incomplete, so it couldn’t be opened.`
    case 'too-many':
      return `“${archiveName}” has more than ${MAX_ARCHIVE_IMAGES.toLocaleString('en-US')} images. Split it into smaller archives.`
    case 'too-large':
      return `“${archiveName}” unpacks to more than 2 GB. Split it into smaller archives.`
    case 'empty':
      return `No images found in “${archiveName}”.`
    case 'unsupported':
      return `“${archiveName}” uses a compression method this tool can’t read.`
    case 'memory':
      return `Your browser ran out of memory unpacking “${archiveName}”. Try a smaller archive.`
  }
}

const JUNK_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini', 'ehthumbs.db'])

/** macOS resource forks, Finder and Explorer metadata. */
export function isJunkPath(path: string): boolean {
  const segments = path.split(/[\\/]/).filter(Boolean)
  if (segments.some((s) => s === '__MACOSX')) return true
  const name = segments.at(-1)?.toLowerCase() ?? ''
  return JUNK_NAMES.has(name) || name.startsWith('._')
}

export type ArchivePlan =
  | { ok: true; images: ArchiveEntryInfo[]; ignored: number; totalBytes: number }
  | { ok: false; error: ArchiveErrorKind }

/**
 * Picks the image entries to unpack. Stops as soon as a limit is crossed, so a huge (or lying)
 * central directory is never fully trusted. Nested archives and other files are ignored, not
 * opened. Works with lazy iterables such as unrar's header generator.
 */
export function planArchive(
  entries: Iterable<ArchiveEntryInfo>,
  limits: ArchiveLimits = ARCHIVE_LIMITS,
): ArchivePlan {
  const images: ArchiveEntryInfo[] = []
  let ignored = 0
  let totalBytes = 0
  for (const entry of entries) {
    if (entry.directory || entry.path.endsWith('/')) continue
    if (isJunkPath(entry.path) || archiveKind(entry.path) || !formatFromName(entry.path)) {
      ignored++
      continue
    }
    if (entry.encrypted) return { ok: false, error: 'encrypted' }
    if (!Number.isFinite(entry.size) || entry.size < 0) return { ok: false, error: 'corrupt' }
    totalBytes += entry.size
    if (totalBytes > limits.maxBytes) return { ok: false, error: 'too-large' }
    images.push(entry)
    if (images.length > limits.maxImages) return { ok: false, error: 'too-many' }
  }
  if (images.length === 0) return { ok: false, error: 'empty' }
  return { ok: true, images, ignored, totalBytes }
}

/** "photos/2024/a.jpg" → { dir: "photos/2024", name: "a.jpg" }. */
export function splitPath(path: string): { dir: string; name: string } {
  const normalized = path.replace(/\\/g, '/')
  const slash = normalized.lastIndexOf('/')
  return slash === -1
    ? { dir: '', name: normalized }
    : { dir: normalized.slice(0, slash), name: normalized.slice(slash + 1) }
}
