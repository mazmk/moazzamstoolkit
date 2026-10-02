import { downloadLoom, resolveLoom } from './loom'
import type { ParsedVideoUrl } from './providers'
import type { DownloadOptions, ResolvedVideo } from './types'

export async function resolveVideo(
  parsed: ParsedVideoUrl,
  signal?: AbortSignal,
): Promise<ResolvedVideo> {
  switch (parsed.provider) {
    case 'loom':
      return resolveLoom(parsed.id, signal)
    case 'jam':
      // Jam has no public endpoint for a recording's video, so there's nothing to resolve against yet.
      throw new Error('Jam links aren’t supported yet — only Loom works for now.')
  }
}

export function downloadVideo(video: ResolvedVideo, options: DownloadOptions): Promise<Blob> {
  switch (video.provider) {
    case 'loom':
      return downloadLoom(video, options)
    case 'jam':
      return Promise.reject(new Error('Jam downloads aren’t supported yet.'))
  }
}

export function fileNameFor(video: ResolvedVideo): string {
  const extension = video.source.kind === 'file' ? video.source.extension : 'webm'
  const base =
    video.title
      .replace(/[\\/:*?"<>|]+/g, '-')
      .trim()
      .slice(0, 120) || video.id
  return `${base}.${extension}`
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  // Safari can cancel the download if the URL is revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
