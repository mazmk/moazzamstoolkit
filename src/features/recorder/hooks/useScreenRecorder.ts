import fixWebmDuration from 'fix-webm-duration'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useRecorderStore } from '../store'

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'error'

export interface UseScreenRecorderReturn {
  status: RecorderStatus
  start: () => Promise<void>
  stop: () => void
  error: Error | null
}

const MIME_CANDIDATES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']

function preferredMimeType(): string {
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)

  // Zustand store actions are stable references — safe to use directly in useCallback deps.
  const saveRecording = useRecorderStore((s) => s.saveRecording)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
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
      setError(err instanceof Error ? err : new Error(String(err)))
      setStatus('error')
    }
  }, [saveRecording])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    // Stop recorder first so onstop fires after the final chunk is written,
    // then stop stream tracks to dismiss the browser's "sharing" indicator.
    recorder.stop()
    stopStream()
  }, [stopStream])

  const start = useCallback(async () => {
    setError(null)
    setStatus('requesting')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      })
    } catch (err) {
      // User dismissed the picker — not an error worth surfacing.
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setStatus('idle')
      } else {
        setError(err instanceof Error ? err : new Error(String(err)))
        setStatus('error')
      }
      return
    }

    streamRef.current = stream
    chunksRef.current = []
    startTimeRef.current = Date.now()

    const mimeType = preferredMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = handleStop

    // User clicked "Stop sharing" in the browser chrome — mirror that to stop().
    stream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
        // Stream tracks are already stopped by the browser; just clear the ref.
        streamRef.current = null
      }
    })

    recorder.start(1_000) // request a chunk every second
    setStatus('recording')
  }, [handleStop])

  // Release resources if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      stopStream()
    }
  }, [stopStream])

  return { status, start, stop, error }
}
