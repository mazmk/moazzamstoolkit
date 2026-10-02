import {
  Camera,
  Circle,
  Eye,
  EyeOff,
  Loader2,
  Mic,
  MicOff,
  Monitor,
  Square,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { formatDuration } from '@/shared/lib/format'

import { useMediaPermissions } from '../hooks/useMediaPermissions'
import { useScreenRecorder } from '../hooks/useScreenRecorder'
import type { BubbleSize } from '../lib/overlay'
import { useRecorderSettings, type RecordingMode } from '../store'
import { PermissionGate } from './PermissionGate'
import { RecorderStage } from './RecorderStage'
import { RecordingsList } from './RecordingsList'

const MODES: { value: RecordingMode; label: string; icon: LucideIcon }[] = [
  { value: 'screen', label: 'Screen', icon: Monitor },
  { value: 'camera', label: 'Webcam test', icon: Camera },
]

const SIZES: { value: BubbleSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
]

const toolButton =
  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const toolOn = 'bg-surface-muted text-fg'
const toolOff = 'text-fg-muted hover:text-fg'

// Mobile browsers don't implement getDisplayMedia, so screen capture is desktop-only.
const canCaptureScreen = () =>
  typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function'

// Mounted only while recording, so the counter starts at 0:00 every time.
function RecordingTimer() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 250)
    return () => clearInterval(id)
  }, [])

  return <span className="font-mono tabular-nums">{formatDuration(elapsed)}</span>
}

export function RecorderPage() {
  const permissions = useMediaPermissions()
  const { status, start, stop, error, screenStream } = useScreenRecorder()

  const screenSupported = canCaptureScreen()
  const preferredMode = useRecorderSettings((s) => s.mode)
  const mode = screenSupported ? preferredMode : 'camera'
  const micEnabled = useRecorderSettings((s) => s.micEnabled)
  const overlay = useRecorderSettings((s) => s.overlay)
  const setMode = useRecorderSettings((s) => s.setMode)
  const setMicEnabled = useRecorderSettings((s) => s.setMicEnabled)
  const setOverlay = useRecorderSettings((s) => s.setOverlay)

  const isRecording = status === 'recording'
  const isBusy = status === 'requesting' || status === 'processing'
  const isActive = isRecording || isBusy

  const handleStart = () => {
    const camera = permissions.stream
    void start({
      mode,
      camera,
      mic: micEnabled ? (camera?.getAudioTracks()[0] ?? null) : null,
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-fg">Screen Recorder</h1>
      <p className="mt-2 text-fg-muted">
        Record your screen or webcam directly in the browser. Recordings are saved locally.
      </p>

      {!screenSupported && permissions.ready && (
        <p className="mt-4 rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg-muted">
          Screen recording needs a desktop browser. You can still record from your webcam here.
        </p>
      )}

      {!permissions.ready || !permissions.stream ? (
        <PermissionGate
          camera={permissions.camera}
          microphone={permissions.microphone}
          requesting={permissions.requesting}
          error={permissions.error}
          onRequest={() => void permissions.request()}
        />
      ) : (
        <div className="mt-6 space-y-4 sm:mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Recording mode"
              className="flex w-full gap-1 rounded-lg border border-line bg-surface p-1 sm:w-auto"
            >
              {MODES.map(({ value, label, icon: Icon }) => {
                const unsupported = value === 'screen' && !screenSupported
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    disabled={isActive || unsupported}
                    title={
                      unsupported ? 'Screen recording isn’t supported on this device' : undefined
                    }
                    onClick={() => setMode(value)}
                    className={`${toolButton} flex-1 justify-center sm:flex-none ${mode === value ? 'bg-accent text-accent-fg' : toolOff}`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                aria-pressed={micEnabled}
                disabled={isActive}
                onClick={() => setMicEnabled(!micEnabled)}
                title={isActive ? 'Change the mic before you start recording' : undefined}
                className={`${toolButton} ${micEnabled ? toolOn : toolOff}`}
              >
                {micEnabled ? <Mic size={15} /> : <MicOff size={15} className="text-danger" />}
                {micEnabled ? 'Mic on' : 'Mic off'}
              </button>

              {mode === 'screen' && (
                <>
                  <button
                    type="button"
                    aria-pressed={overlay.visible}
                    onClick={() => setOverlay({ visible: !overlay.visible })}
                    className={`${toolButton} ${overlay.visible ? toolOn : toolOff}`}
                  >
                    {overlay.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                    {overlay.visible ? 'Webcam shown' : 'Webcam hidden'}
                  </button>

                  <div role="group" aria-label="Webcam size" className="ml-1 flex gap-1">
                    {SIZES.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={overlay.size === value}
                        aria-label={`Webcam size ${label}`}
                        disabled={!overlay.visible}
                        onClick={() => setOverlay({ size: value })}
                        className={`${toolButton} w-8 justify-center px-0 ${overlay.size === value ? toolOn : toolOff}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <RecorderStage
            mode={mode}
            camera={permissions.stream}
            screen={screenStream}
            overlay={overlay}
            onOverlayChange={setOverlay}
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {isRecording ? (
              <button
                type="button"
                onClick={stop}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-danger-solid px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-danger-solid-hover sm:w-auto"
              >
                <Square size={15} fill="currentColor" />
                Stop recording
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isBusy ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Circle size={15} fill="currentColor" />
                )}
                {status === 'requesting'
                  ? mode === 'screen'
                    ? 'Choose what to share…'
                    : 'Starting…'
                  : status === 'processing'
                    ? 'Saving…'
                    : 'Start recording'}
              </button>
            )}

            {isRecording && (
              <span className="flex items-center gap-2 text-sm text-danger">
                <span className="h-2 w-2 animate-pulse rounded-full bg-danger-solid" />
                <RecordingTimer />
              </span>
            )}

            {mode === 'screen' && !isActive && (
              <span className="text-xs text-fg-subtle">Drag the webcam bubble to position it.</span>
            )}
          </div>

          {status === 'error' && error && (
            <p role="alert" className="text-sm text-danger">
              Recording failed: {error.message}
            </p>
          )}
        </div>
      )}

      <RecordingsList />
    </div>
  )
}
