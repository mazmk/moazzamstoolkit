import { Monitor } from 'lucide-react'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { useElementSize } from '@/shared/hooks/useElementSize'

import { bubbleRect, positionFromRect, type OverlaySettings } from '../lib/overlay'
import type { RecordingMode } from '../store'
import { StreamVideo } from './StreamVideo'

interface RecorderStageProps {
  mode: RecordingMode
  camera: MediaStream
  screen: MediaStream | null
  overlay: OverlaySettings
  onOverlayChange: (patch: Partial<OverlaySettings>) => void
}

function aspectOf(stream: MediaStream | null): number | null {
  const { width, height } = stream?.getVideoTracks()[0]?.getSettings() ?? {}
  return width && height ? width / height : null
}

/**
 * Live preview of what gets recorded. In screen mode the webcam bubble is laid out with the same
 * math the canvas compositor uses, so where you drag it here is where it lands in the video.
 */
export function RecorderStage({
  mode,
  camera,
  screen,
  overlay,
  onOverlayChange,
}: RecorderStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const { width, height } = useElementSize(stageRef)

  const aspect = (mode === 'screen' ? aspectOf(screen) : aspectOf(camera)) ?? 16 / 9
  const bubble = bubbleRect(width, height, overlay)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current?.getBoundingClientRect()
    if (!dragOffsetRef.current || !stage) return
    const left = e.clientX - stage.left - dragOffsetRef.current.x
    const top = e.clientY - stage.top - dragOffsetRef.current.y
    onOverlayChange(positionFromRect(stage.width, stage.height, overlay.size, left, top))
  }

  const endDrag = () => {
    dragOffsetRef.current = null
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.25 : 0.05
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = delta[e.key]
    if (!move) return
    e.preventDefault()
    onOverlayChange({
      x: Math.min(1, Math.max(0, overlay.x + move[0])),
      y: Math.min(1, Math.max(0, overlay.y + move[1])),
    })
  }

  return (
    <div
      ref={stageRef}
      style={{ aspectRatio: aspect }}
      className="relative w-full overflow-hidden rounded-frame bg-black/[0.04] shadow-[inset_0_0_0_1px_var(--glass-border-bottom)] dark:bg-black/35"
    >
      {mode === 'camera' ? (
        <StreamVideo stream={camera} mirrored className="h-full w-full object-cover" />
      ) : screen ? (
        <StreamVideo stream={screen} className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="glass-inset grid size-12 place-items-center text-fg-muted">
            <Monitor size={22} />
          </span>
          <p className="max-w-56 text-sm text-fg-muted">
            Your screen appears here once you start recording
          </p>
        </div>
      )}

      {mode === 'screen' && overlay.visible && width > 0 && (
        <div
          role="slider"
          aria-label="Webcam position — drag or use arrow keys to move"
          aria-valuetext={`${Math.round(overlay.x * 100)}% across, ${Math.round(overlay.y * 100)}% down`}
          aria-valuenow={Math.round(overlay.x * 100)}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ left: bubble.left, top: bubble.top, width: bubble.size, height: bubble.size }}
          className="absolute cursor-grab touch-none overflow-hidden rounded-full shadow-[0_12px_32px_-8px_rgb(0_0_0/0.5)] ring-2 ring-white/85 transition-shadow duration-200 select-none hover:ring-white active:cursor-grabbing"
        >
          <StreamVideo
            stream={camera}
            mirrored
            className="pointer-events-none h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  )
}
