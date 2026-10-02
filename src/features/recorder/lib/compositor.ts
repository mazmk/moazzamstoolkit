import { bubbleRect, type OverlaySettings } from './overlay'

const FPS = 30

export interface Compositor {
  stream: MediaStream
  stop: () => void
}

async function playHidden(stream: MediaStream): Promise<HTMLVideoElement> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  await video.play()
  return video
}

// Background tabs throttle requestAnimationFrame and main-thread timers to ~1Hz, which would
// freeze the recording while the user is in another window. Worker timers keep ticking.
function createWorkerTicker(intervalMs: number, onTick: () => void): () => void {
  const source = `setInterval(() => postMessage(0), ${intervalMs})`
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  const worker = new Worker(url)
  worker.onmessage = onTick
  return () => {
    worker.terminate()
    URL.revokeObjectURL(url)
  }
}

/**
 * Draws the screen capture with the webcam bubble on top into a canvas and returns its stream.
 * `getOverlay` is read every frame so the bubble can be moved, resized or hidden mid-recording.
 */
export async function createCompositor(
  screen: MediaStream,
  camera: MediaStream,
  getOverlay: () => OverlaySettings,
): Promise<Compositor> {
  const [screenVideo, cameraVideo] = await Promise.all([playHidden(screen), playHidden(camera)])

  const canvas = document.createElement('canvas')
  canvas.width = screenVideo.videoWidth || 1920
  canvas.height = screenVideo.videoHeight || 1080
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available')

  const draw = () => {
    const { width, height } = canvas
    ctx.drawImage(screenVideo, 0, 0, width, height)

    const overlay = getOverlay()
    const vw = cameraVideo.videoWidth
    const vh = cameraVideo.videoHeight
    if (!overlay.visible || !vw || !vh) return

    const { left, top, size } = bubbleRect(width, height, overlay)
    const crop = Math.min(vw, vh)

    ctx.save()
    ctx.beginPath()
    ctx.arc(left + size / 2, top + size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
    // Mirror to match the selfie-style preview the user positioned it with.
    ctx.translate(left + size, top)
    ctx.scale(-1, 1)
    ctx.drawImage(cameraVideo, (vw - crop) / 2, (vh - crop) / 2, crop, crop, 0, 0, size, size)
    ctx.restore()
  }

  draw()
  const stopTicker = createWorkerTicker(1000 / FPS, draw)
  const stream = canvas.captureStream(FPS)

  return {
    stream,
    stop: () => {
      stopTicker()
      stream.getTracks().forEach((t) => t.stop())
      screenVideo.srcObject = null
      cameraVideo.srcObject = null
    },
  }
}

/** Mixes several audio tracks (e.g. tab audio + mic) into one, since MediaRecorder only records the first. */
export function mixAudioTracks(tracks: MediaStreamTrack[]): {
  track: MediaStreamTrack | null
  stop: () => void
} {
  if (tracks.length <= 1) return { track: tracks[0] ?? null, stop: () => {} }

  const audioCtx = new AudioContext()
  const destination = audioCtx.createMediaStreamDestination()
  for (const track of tracks) {
    audioCtx.createMediaStreamSource(new MediaStream([track])).connect(destination)
  }
  return {
    track: destination.stream.getAudioTracks()[0] ?? null,
    stop: () => void audioCtx.close(),
  }
}
