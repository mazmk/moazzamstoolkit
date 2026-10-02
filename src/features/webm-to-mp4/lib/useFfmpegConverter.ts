import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  buildFfmpegArgs,
  type CompressionChoice,
  type ResolutionChoice,
  type VideoDimensions,
} from './args'
import { ConversionError, classifyConversionFailure, messageFor } from './errors'
import { toMp4FileName } from './files'
import { estimateRemainingMs, parseFfmpegTime, progressRatio } from './progress'

export type EngineState =
  | { status: 'unloaded' }
  | { status: 'loading'; loadedBytes: number; totalBytes: number | null }
  | { status: 'ready' }
  | { status: 'error'; error: ConversionError }

export interface ConversionResult {
  blob: Blob
  url: string
  fileName: string
}

export type JobState =
  | { status: 'idle' }
  | { status: 'converting'; ratio: number | null; elapsedMs: number; remainingMs: number | null }
  | { status: 'done'; result: ConversionResult; elapsedMs: number }
  | { status: 'error'; error: ConversionError }

export interface ConvertOptions {
  file: Blob
  fileName: string
  durationSec: number | null
  dimensions: VideoDimensions | null
  resolution: ResolutionChoice
  compression: CompressionChoice
}

const LOADING: EngineState = { status: 'loading', loadedBytes: 0, totalBytes: null }

const INPUT = 'input.webm'
const OUTPUT = 'output.mp4'
const LOG_LINES_KEPT = 60
const TICK_MS = 500

interface CoreUrls {
  coreURL: string
  wasmURL: string
}

// Blob URLs for the core are created once per session and reused across terminate/reload, so
// only the very first load downloads ~32 MB.
let coreUrls: Promise<CoreUrls> | null = null

function loadCoreUrls(onProgress: (loaded: number, total: number | null) => void) {
  coreUrls ??= (async () => {
    const [{ toBlobURL }, { default: coreSrc }, { default: wasmSrc }] = await Promise.all([
      import('@ffmpeg/util'),
      import('@ffmpeg/core?url'),
      import('@ffmpeg/core/wasm?url'),
    ])
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(coreSrc, 'text/javascript'),
      toBlobURL(wasmSrc, 'application/wasm', true, (e) =>
        onProgress(e.received, e.total > 0 ? e.total : null),
      ),
    ])
    return { coreURL, wasmURL }
  })().catch((err: unknown) => {
    coreUrls = null // let "Try again" refetch
    throw err
  })
  return coreUrls
}

/**
 * Runs ffmpeg.wasm (single-threaded core, so no COOP/COEP headers are needed). The engine loads on
 * mount; `convert` writes the input into wasm memory, runs ffmpeg, and returns an MP4 object URL
 * that is revoked on reset, on the next conversion and on unmount.
 */
export function useFfmpegConverter() {
  // The page loads the engine on mount, so it starts out loading.
  const [engine, setEngine] = useState<EngineState>(LOADING)
  const [job, setJob] = useState<JobState>({ status: 'idle' })
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const loadingRef = useRef<Promise<FFmpeg> | null>(null)
  const cancelledRef = useRef(false)
  const resultUrlRef = useRef<string | null>(null)

  const revokeResult = () => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    resultUrlRef.current = null
  }

  const load = useCallback((): Promise<FFmpeg> => {
    if (ffmpegRef.current?.loaded) return Promise.resolve(ffmpegRef.current)
    loadingRef.current ??= (async () => {
      try {
        const urls = await loadCoreUrls((loadedBytes, totalBytes) =>
          // Download-progress callback: runs asynchronously as bytes arrive, not during the effect.
          // eslint-disable-next-line @eslint-react/set-state-in-effect
          setEngine({ status: 'loading', loadedBytes, totalBytes }),
        )
        const { FFmpeg } = await import('@ffmpeg/ffmpeg')
        const ffmpeg = new FFmpeg()
        await ffmpeg.load(urls)
        ffmpegRef.current = ffmpeg
        setEngine({ status: 'ready' })
        return ffmpeg
      } catch {
        const error = new ConversionError('load', messageFor('load'))
        setEngine({ status: 'error', error })
        throw error
      } finally {
        loadingRef.current = null
      }
    })()
    return loadingRef.current
  }, [])

  useEffect(() => {
    load().catch(() => {}) // surfaced through `engine`
    return () => {
      ffmpegRef.current?.terminate()
      ffmpegRef.current = null
      revokeResult()
    }
  }, [load])

  const convert = useCallback(
    async ({
      file,
      fileName,
      durationSec,
      dimensions,
      resolution,
      compression,
    }: ConvertOptions) => {
      revokeResult()
      cancelledRef.current = false
      const startedAt = performance.now()
      let ratio: number | null = durationSec ? 0 : null
      const logs: string[] = []

      setJob({ status: 'converting', ratio, elapsedMs: 0, remainingMs: null })
      const tick = setInterval(() => {
        const elapsedMs = performance.now() - startedAt
        setJob({
          status: 'converting',
          ratio,
          elapsedMs,
          remainingMs: estimateRemainingMs(elapsedMs, ratio),
        })
      }, TICK_MS)

      const onLog = ({ message }: { message: string }) => {
        logs.push(message)
        if (logs.length > LOG_LINES_KEPT) logs.shift()
        const position = parseFfmpegTime(message)
        if (position !== null && durationSec) ratio = progressRatio(position, durationSec)
      }

      let ffmpeg: FFmpeg | null = null
      try {
        ffmpeg = await load()
        ffmpeg.on('log', onLog)
        const { fetchFile } = await import('@ffmpeg/util')
        await ffmpeg.writeFile(INPUT, await fetchFile(file))
        const code = await ffmpeg.exec(
          buildFfmpegArgs({
            input: INPUT,
            output: OUTPUT,
            resolution,
            compression,
            source: dimensions,
          }),
        )
        if (code !== 0) throw classifyConversionFailure(null, logs)

        const data = await ffmpeg.readFile(OUTPUT)
        if (typeof data === 'string' || data.byteLength === 0) {
          throw classifyConversionFailure(null, logs)
        }
        const blob = new Blob([data.slice()], { type: 'video/mp4' })
        const url = URL.createObjectURL(blob)
        resultUrlRef.current = url
        setJob({
          status: 'done',
          result: { blob, url, fileName: toMp4FileName(fileName) },
          elapsedMs: performance.now() - startedAt,
        })
      } catch (err) {
        if (cancelledRef.current) return
        setJob({ status: 'error', error: classifyConversionFailure(err, logs) })
      } finally {
        clearInterval(tick)
        ffmpeg?.off('log', onLog)
        // Free wasm memory between runs; the files may not exist if a step failed.
        if (ffmpeg && !cancelledRef.current) {
          await ffmpeg.deleteFile(INPUT).catch(() => {})
          await ffmpeg.deleteFile(OUTPUT).catch(() => {})
        }
      }
    },
    [load],
  )

  /** Terminates the worker mid-conversion, then loads a fresh one from the cached core. */
  const cancel = useCallback(() => {
    cancelledRef.current = true
    ffmpegRef.current?.terminate()
    ffmpegRef.current = null
    setJob({ status: 'idle' })
    setEngine(LOADING)
    load().catch(() => {})
  }, [load])

  const reset = useCallback(() => {
    revokeResult()
    setJob({ status: 'idle' })
  }, [])

  const retryLoad = useCallback(() => {
    setEngine(LOADING)
    load().catch(() => {})
  }, [load])

  return { engine, job, convert, cancel, reset, retryLoad }
}
