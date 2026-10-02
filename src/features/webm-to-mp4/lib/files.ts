/** Above this, ffmpeg.wasm can run out of memory (input + output both live in wasm memory). */
export const LARGE_FILE_BYTES = 500 * 1024 * 1024

export function isWebmFile(file: Pick<File, 'name' | 'type'>): boolean {
  return /\.webm$/i.test(file.name) || file.type === 'video/webm'
}

/** "My clip.final.webm" → "My clip.final.mp4". Keeps the base name; never returns an empty name. */
export function toMp4FileName(name: string): string {
  const base = name
    .replace(/[\\/]/g, '-')
    .replace(/\.[^.]*$/, '')
    .trim()
  return `${base || 'video'}.mp4`
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}
