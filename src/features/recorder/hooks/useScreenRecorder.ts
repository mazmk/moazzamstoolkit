import fixWebmDuration from 'fix-webm-duration'
import { useCallback, useEffect, useRef, useState } from 'react'

import { createCompositor, mixAudioTracks } from '../lib/compositor'
import { useRecorderSettings, useRecorderStore, type RecordingMode } from '../store'

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'error'

export interface StartOptions {
  mode: RecordingMode
  /** Webcam stream — the bubble in screen mode, the whole frame in camera mode. */
  camera: MediaStream | null
  /** Mic track to record, or null to record without the mic. */
  mic: MediaStreamTrack | null
}

export interface UseScreenRecorderReturn {
  status: RecorderStatus
  start: (options: StartOptions) => Promise<void>
  stop: () => void
  error: Error | null
  /** The raw screen capture while recording in screen mode, for previewing. */
  screenStream: MediaStream | null
}

const MIME_CANDIDATES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']

function preferredMimeType(): string {
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

const toError = (err: unknown) => (err instanceof Error ? err : new Error(String(err)))

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  // Everything opened for the current recording (display capture, compositor, track clones, audio graph).
  const cleanupsRef = useRef<(() => void)[]>([])

  // Zustand store actions are stable references — safe to use directly in useCallback deps.
  const saveRecording = useRecorderStore((s) => s.saveRecording)

  const releaseResources = useCallback(() => {
    cleanupsRef.current.forEach((fn) => fn())
    cleanupsRef.current = []
    setScreenStream(null)
  }, [])

  // Called by MediaRecorder.onstop — runs after the final chunk is flushed.
  const handleStop = useCallback(async () => {
    setStatus('processing')

    const duration = Date.now() - startTimeRef.current
    const mimeType = recorderRef.current?.mimeType ?? 'video/webm'
    const raw = new Blob(chunksRef.current, { type: mimeType })
    chunksRef.current = []
    recorderRef.current = null

    try {
      const fixed = await fixWebmDuration(raw, duration, { logger: false })
      await saveRecording({
        id: crypto.randomUUID(),
        name: `Recording ${new Date().toLocaleString()}`,
        blob: fixed,
        duration,
        createdAt: startTimeRef.current,
        size: fixed.size,
      })
      setStatus('idle')
    } catch (err) {
      setError(toError(err))
      setStatus('error')
    }
  }, [saveRecording])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    // Stop recorder first so onstop fires after the final chunk is written,
    // then release capture tracks to dismiss the browser's "sharing" indicator.
    recorder.stop()
    releaseResources()
  }, [releaseResources])

  const start = useCallback(
    async ({ mode, camera, mic }: StartOptions) => {
      setError(null)
      setStatus('requesting')

      let display: MediaStream | null = null
      if (mode === 'screen') {
        try {
          display = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: { ideal: 30 } },
            audio: true,
          })
        } catch (err) {
          // User dismissed the picker — not an error worth surfacing.
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            setStatus('idle')
          } else {
            setError(toError(err))
            setStatus('error')
          }
          return
        }
      }

      const cleanups: (() => void)[] = []
      cleanupsRef.current = cleanups

      try {
        let videoTrack: MediaStreamTrack | undefined
        const audioTracks: MediaStreamTrack[] = []

        if (display) {
          const capture = display
          cleanups.push(() => capture.getTracks().forEach((t) => t.stop()))
          audioTracks.push(...capture.getAudioTracks())

          if (camera) {
            const compositor = await createCompositor(
              capture,
              camera,
              () => useRecorderSettings.getState().overlay,
            )
            cleanups.push(compositor.stop)
            videoTrack = compositor.stream.getVideoTracks()[0]
          } else {
            videoTrack = capture.getVideoTracks()[0]
          }

          // User clicked "Stop sharing" in the browser chrome — mirror that to stop().
          capture.getVideoTracks()[0]?.addEventListener('ended', stop)
          setScreenStream(capture)
        } else {
          // Clone so stopping the recording doesn't kill the live camera preview.
          const clone = camera?.getVideoTracks()[0]?.clone()
          if (clone) cleanups.push(() => clone.stop())
          videoTrack = clone
        }

        if (!videoTrack) throw new Error('No video source is available to record.')

        if (mic) {
          const micClone = mic.clone()
          cleanups.push(() => micClone.stop())
          audioTracks.push(micClone)
        }
        const audio = mixAudioTracks(audioTracks)
        cleanups.push(audio.stop)

        const stream = new MediaStream(audio.track ? [videoTrack, audio.track] : [videoTrack])
        const mimeType = preferredMimeType()
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        recorderRef.current = recorder
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }
        recorder.onstop = handleStop

        startTimeRef.current = Date.now()
        recorder.start(1_000) // request a chunk every second
        setStatus('recording')
      } catch (err) {
        releaseResources()
        setError(toError(err))
        setStatus('error')
      }
    },
    [handleStop, releaseResources, stop],
  )

  // Release resources if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      releaseResources()
    }
  }, [releaseResources])

  return { status, start, stop, error, screenStream }
}
