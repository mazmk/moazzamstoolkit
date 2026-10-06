const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** "0 B", "980 B", "1.2 KB", "86.4 MB", "1.25 GB". Binary units (1 KB = 1024 B), like OS file sizes. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** exponent
  if (exponent === 0) return `${Math.round(value)} B`
  // Three significant figures at most: 1.25 GB, 86.4 MB, 512 KB.
  const digits = exponent >= 3 ? 2 : value < 100 ? 1 : 0
  const text = value.toFixed(digits)
  // 1023.95 KB rounds to "1024.0 KB"; show the next unit instead.
  if (Number(text) >= 1024 && exponent < UNITS.length - 1) {
    return formatBytes(1024 ** (exponent + 1))
  }
  return `${text} ${UNITS[exponent]}`
}

/** Bytes saved as a whole percentage of the original. Negative when the output is larger. */
export function savingsPercent(original: number, compressed: number): number {
  if (original <= 0) return 0
  const percent = Math.round(((original - compressed) / original) * 100)
  return Object.is(percent, -0) ? 0 : percent
}

/** "saved 75%", "4% larger", "no change". */
export function formatSavings(original: number, compressed: number): string {
  const percent = savingsPercent(original, compressed)
  if (percent > 0) return `saved ${percent}%`
  if (percent < 0) return `${-percent}% larger`
  return 'no change'
}

/** Parses the target-size field: a positive number of KB or MB, or null. */
export function targetBytes(value: number, unit: 'KB' | 'MB'): number | null {
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * (unit === 'MB' ? 1024 * 1024 : 1024))
}

/** Narrows loosely typed bytes (e.g. from fflate or postMessage) to a plain ArrayBuffer view. */
export function plainBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const buffer = bytes.buffer
  return buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer, bytes.byteOffset, bytes.byteLength)
    : bytes.slice()
}
