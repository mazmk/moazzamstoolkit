import { useCallback, useEffect, useState } from 'react'

export type DevicePermission = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported'

export interface UseMediaPermissionsReturn {
  camera: DevicePermission
  microphone: DevicePermission
  /** Live camera + mic stream, available once both are granted. */
  stream: MediaStream | null
  ready: boolean
  requesting: boolean
  error: string | null
  request: () => Promise<void>
}

const CONSTRAINTS: MediaStreamConstraints = {
  video: { width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: { echoCancellation: true, noiseSuppression: true },
}

const isSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

// Not every browser accepts 'camera' / 'microphone' in the Permissions API — treat failures as unknown.
async function queryPermission(name: 'camera' | 'microphone'): Promise<DevicePermission> {
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName })
    return status.state
  } catch {
    return 'prompt'
  }
}

function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return 'Access was blocked. Allow camera and microphone in your browser’s site settings, then try again.'
      case 'NotFoundError':
        return 'No camera or microphone was found. Connect one and try again.'
      case 'NotReadableError':
        return 'Your camera or microphone is in use by another app.'
    }
  }
  return err instanceof Error ? err.message : String(err)
}

export function useMediaPermissions(): UseMediaPermissionsReturn {
  const supported = isSupported()
  const [camera, setCamera] = useState<DevicePermission>(supported ? 'checking' : 'unsupported')
  const [microphone, setMicrophone] = useState<DevicePermission>(
    supported ? 'checking' : 'unsupported',
  )
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On mount, check existing permissions. If both were granted before, open the devices
  // silently so returning users skip the gate.
  useEffect(() => {
    if (!supported) return
    let cancelled = false

    void (async () => {
      const [cam, mic] = await Promise.all([
        queryPermission('camera'),
        queryPermission('microphone'),
      ])
      if (cancelled) return
      setCamera(cam)
      setMicrophone(mic)
      if (cam !== 'granted' || mic !== 'granted') return

      try {
        const s = await navigator.mediaDevices.getUserMedia(CONSTRAINTS)
        if (cancelled) s.getTracks().forEach((t) => t.stop())
        else setStream(s)
      } catch (err) {
        if (!cancelled) setError(describeError(err))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [supported])

  // Release the devices whenever the stream is replaced or the component unmounts.
  useEffect(() => {
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [stream])

  const request = useCallback(async () => {
    if (!isSupported()) return
    setError(null)
    setRequesting(true)
    try {
      const s = await navigator.mediaDevices.getUserMedia(CONSTRAINTS)
      setStream(s)
      setCamera('granted')
      setMicrophone('granted')
    } catch (err) {
      setError(describeError(err))
      // Re-query so each device shows its real state; a blanket NotAllowedError doesn't say which was blocked.
      const [cam, mic] = await Promise.all([
        queryPermission('camera'),
        queryPermission('microphone'),
      ])
      const blocked = err instanceof DOMException && err.name === 'NotAllowedError'
      setCamera(blocked && cam === 'prompt' ? 'denied' : cam)
      setMicrophone(blocked && mic === 'prompt' ? 'denied' : mic)
    } finally {
      setRequesting(false)
    }
  }, [])

  return {
    camera,
    microphone,
    stream,
    ready: camera === 'granted' && microphone === 'granted' && stream !== null,
    requesting,
    error,
    request,
  }
}
