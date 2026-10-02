import fixWebmDuration from 'fix-webm-duration'

import type { VideoDimensions } from './args'

export interface ProbedVideo {
  /** File to convert — the original, or a copy with its duration header patched. */
  file: Blob
  durationSec: number | null
  dimensions: VideoDimensions | null
  hasVideo: boolean
}

const LOAD_TIMEOUT_MS = 10_000

function loadMetadata(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    const timer = setTimeout(
      () => reject(new Error('Timed out reading video metadata')),
      LOAD_TIMEOUT_MS,
    )
    video.onloadedmetadata = () => {
      clearTimeout(timer)
      resolve(video)
    }
    video.onerror = () => {
      clearTimeout(timer)
      reject(new Error('The browser could not read this video'))
    }
    video.src = url
  })
}

/**
 * MediaRecorder WebMs often have no duration header, so the element reports Infinity. Seeking far
 * past the end makes the browser scan the file and report the real duration.
 */
function discoverDuration(video: HTMLVideoElement): Promise<number | null> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      video.ondurationchange = null
      video.ontimeupdate = null
      const d = video.duration
      resolve(Number.isFinite(d) && d > 0 ? d : null)
    }
    const timer = setTimeout(done, 5000)
    video.ondurationchange = () => {
      if (Number.isFinite(video.duration)) done()
    }
    video.ontimeupdate = done
    video.currentTime = Number.MAX_SAFE_INTEGER
  })
}

const isUsableDuration = (d: number) => Number.isFinite(d) && d > 0

/**
 * Reads duration and resolution with a hidden <video>. If the duration is missing, it's recovered
 * and written into the file with fix-webm-duration so ffmpeg sees it too. If that still fails,
 * durationSec is null and the UI falls back to an indeterminate progress bar.
 */
export async function probeVideo(file: File): Promise<ProbedVideo> {
  const url = URL.createObjectURL(file)
  try {
    const video = await loadMetadata(url)
    const dimensions =
      video.videoWidth > 0 && video.videoHeight > 0
        ? { width: video.videoWidth, height: video.videoHeight }
        : null

    if (isUsableDuration(video.duration)) {
      return { file, durationSec: video.duration, dimensions, hasVideo: dimensions !== null }
    }

    const discovered = await discoverDuration(video)
    if (discovered === null) {
      return { file, durationSec: null, dimensions, hasVideo: dimensions !== null }
    }
    try {
      const fixed = await fixWebmDuration(file, discovered * 1000, { logger: false })
      return { file: fixed, durationSec: discovered, dimensions, hasVideo: dimensions !== null }
    } catch {
      return { file, durationSec: discovered, dimensions, hasVideo: dimensions !== null }
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}
