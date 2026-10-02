import { parseDashManifest, type DashRepresentation } from './dash'
import { fetchAllInOrder, fetchBlob } from './fetchMedia'
import type { DownloadOptions, ResolvedVideo, VideoQuality } from './types'

// Loom's public endpoints all send `Access-Control-Allow-Origin: *`, so this runs in the browser with no proxy.
const LOOM = 'https://www.loom.com'

interface LoomOEmbed {
  title?: string
  thumbnail_url?: string
  duration?: number // seconds
}

async function postForUrl(id: string, kind: 'transcoded-url' | 'raw-url', signal?: AbortSignal) {
  const res = await fetch(`${LOOM}/api/campaigns/sessions/${id}/${kind}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
    signal,
  })
  // 204 = this rendition doesn't exist for the video.
  if (!res.ok || res.status === 204) return null
  const data = (await res.json()) as { url?: string }
  return data.url ?? null
}

const pathOf = (url: string) => new URL(url).pathname.toLowerCase()

function qualityLabel(rep: DashRepresentation): string {
  return rep.height ? `${rep.height}p` : `${Math.round(rep.bandwidth / 1000)} kbps`
}

export async function resolveLoom(id: string, signal?: AbortSignal): Promise<ResolvedVideo> {
  const shareUrl = `${LOOM}/share/${id}`
  const oembedRes = await fetch(`${LOOM}/v1/oembed?url=${encodeURIComponent(shareUrl)}`, { signal })
  if (oembedRes.status === 404) {
    throw new Error('Loom video not found. It may be private, password-protected or deleted.')
  }
  if (!oembedRes.ok) throw new Error(`Loom returned an error (HTTP ${oembedRes.status}).`)
  const meta = (await oembedRes.json()) as LoomOEmbed

  const base = {
    provider: 'loom' as const,
    id,
    title: meta.title?.trim() || 'Loom video',
    thumbnailUrl: meta.thumbnail_url ?? null,
    durationMs: meta.duration ? Math.round(meta.duration * 1000) : null,
  }

  // Older videos have a single transcoded MP4; newer ones are only available as a DASH stream.
  const transcoded = await postForUrl(id, 'transcoded-url', signal)
  if (transcoded && pathOf(transcoded).endsWith('.mp4')) {
    return { ...base, source: { kind: 'file', url: transcoded, extension: 'mp4' }, qualities: [] }
  }

  const raw = await postForUrl(id, 'raw-url', signal)
  if (!raw) throw new Error('Loom didn’t return a downloadable stream for this video.')

  const rawPath = pathOf(raw)
  if (rawPath.endsWith('.mp4') || rawPath.endsWith('.webm')) {
    const extension = rawPath.endsWith('.mp4') ? 'mp4' : 'webm'
    return { ...base, source: { kind: 'file', url: raw, extension }, qualities: [] }
  }
  if (!rawPath.endsWith('.mpd'))
    throw new Error('This Loom video uses a format that isn’t supported yet.')

  const manifestRes = await fetch(raw, { signal })
  if (!manifestRes.ok)
    throw new Error(`Couldn’t load the Loom stream (HTTP ${manifestRes.status}).`)
  const representations = parseDashManifest(await manifestRes.text(), raw)

  const videos = representations
    .filter((r) => r.kind === 'video')
    .sort((a, b) => b.bandwidth - a.bandwidth)
  // Prefer the highest-bitrate audio track; Loom normally has exactly one.
  const audio = representations
    .filter((r) => r.kind === 'audio')
    .sort((a, b) => b.bandwidth - a.bandwidth)[0]
  if (videos.length === 0) throw new Error('The Loom stream has no video track.')

  const qualities: VideoQuality[] = videos.map((v) => ({ id: v.id, label: qualityLabel(v) }))
  return { ...base, source: { kind: 'dash', videos, audio: audio ?? null }, qualities }
}

async function fetchRepresentation(
  rep: DashRepresentation,
  options: DownloadOptions,
  mimeType: string,
) {
  const parts = await fetchAllInOrder([rep.initUrl, ...rep.segmentUrls], {
    signal: options.signal,
    onBytes: options.onBytes,
  })
  return new Blob(parts, { type: mimeType })
}

export async function downloadLoom(video: ResolvedVideo, options: DownloadOptions): Promise<Blob> {
  const { source } = video
  if (source.kind === 'file') {
    options.onPhase?.('downloading')
    return fetchBlob(source.url, options)
  }

  const rep = source.videos.find((v) => v.id === options.qualityId) ?? source.videos[0]
  if (!rep) throw new Error('No video quality is available.')

  if (video.durationMs) {
    const bitsPerSecond = rep.bandwidth + (source.audio?.bandwidth ?? 0)
    options.onTotal?.(Math.round((bitsPerSecond / 8) * (video.durationMs / 1000)))
  }

  options.onPhase?.('downloading')
  const [videoBlob, audioBlob] = await Promise.all([
    fetchRepresentation(rep, options, 'video/webm'),
    source.audio ? fetchRepresentation(source.audio, options, 'audio/webm') : Promise.resolve(null),
  ])

  options.onPhase?.('merging')
  // The muxer is ~400 kB, so it's only loaded once a stream actually needs merging.
  const { muxWebm } = await import('./mux')
  const size = rep.width && rep.height ? { width: rep.width, height: rep.height } : undefined
  return muxWebm(videoBlob, audioBlob, size)
}
