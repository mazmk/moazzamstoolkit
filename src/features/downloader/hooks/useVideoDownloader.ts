import { useCallback, useEffect, useRef, useState } from 'react'

import { downloadVideo, fileNameFor, resolveVideo, saveBlob } from '../lib'
import { parseVideoUrl } from '../lib/providers'
import type { DownloadPhase, ResolvedVideo } from '../lib/types'

export type DownloaderState =
  | { status: 'idle' }
  | { status: 'resolving' }
  | { status: 'ready'; video: ResolvedVideo }
  | {
      status: 'downloading'
      video: ResolvedVideo
      phase: DownloadPhase
      loaded: number
      total: number | null
    }
  | { status: 'done'; video: ResolvedVideo; fileName: string }
  | { status: 'error'; message: string; video: ResolvedVideo | null }

const PROGRESS_INTERVAL_MS = 150

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError'
const messageOf = (err: unknown) =>
  err instanceof TypeError
    ? 'Network error — check your connection and try again.'
    : err instanceof Error
      ? err.message
      : String(err)

export function useVideoDownloader() {
  const [state, setState] = useState<DownloaderState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)

  const begin = () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return controller
  }

  useEffect(() => () => abortRef.current?.abort(), [])

  const resolve = useCallback(async (input: string) => {
    const parsed = parseVideoUrl(input)
    if (!parsed) {
      setState({
        status: 'error',
        message: 'Paste a Loom (loom.com/share/…) or Jam (jam.dev/c/…) link.',
        video: null,
      })
      return
    }

    const { signal } = begin()
    setState({ status: 'resolving' })
    try {
      const video = await resolveVideo(parsed, signal)
      if (!signal.aborted) setState({ status: 'ready', video })
    } catch (err) {
      if (!isAbort(err)) setState({ status: 'error', message: messageOf(err), video: null })
    }
  }, [])

  const download = useCallback(async (video: ResolvedVideo, qualityId?: string) => {
    const { signal } = begin()
    let loaded = 0
    let total: number | null = null
    let phase: DownloadPhase = 'downloading'
    let lastFlush = 0

    // Byte callbacks fire per network chunk; throttle re-renders.
    const flush = (force = false) => {
      const now = performance.now()
      if (!force && now - lastFlush < PROGRESS_INTERVAL_MS) return
      lastFlush = now
      if (!signal.aborted) setState({ status: 'downloading', video, phase, loaded, total })
    }

    flush(true)
    try {
      const blob = await downloadVideo(video, {
        qualityId,
        signal,
        onBytes: (bytes) => {
          loaded += bytes
          flush()
        },
        onTotal: (bytes) => {
          total = bytes
        },
        onPhase: (next) => {
          phase = next
          flush(true)
        },
      })
      if (signal.aborted) return
      const fileName = fileNameFor(video)
      saveBlob(blob, fileName)
      setState({ status: 'done', video, fileName })
    } catch (err) {
      if (isAbort(err)) return
      setState({ status: 'error', message: messageOf(err), video })
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState((s) =>
      'video' in s && s.video ? { status: 'ready', video: s.video } : { status: 'idle' },
    )
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ status: 'idle' })
  }, [])

  return { state, resolve, download, cancel, reset }
}
