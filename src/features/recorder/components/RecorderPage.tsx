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

import { useMediaPermissions } from '../hooks/useMediaPermissions'
import { useScreenRecorder } from '../hooks/useScreenRecorder'
import { formatDuration } from '../lib/format'
import type { BubbleSize } from '../lib/overlay'
import { useRecorderSettings, type RecordingMode } from '../store'
import { PermissionGate } from './PermissionGate'
import { RecorderStage } from './RecorderStage'
import { RecordingsList } from './RecordingsList'

const MODES: { value: RecordingMode; label: string; icon: LucideIcon }[] = [
  { value: 'screen', label: 'Screen', icon: Monitor },
  { value: 'camera', label: 'Camera', icon: Camera },
]

const SIZES: { value: BubbleSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
]

const toolButton =
  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const toolOn = 'bg-gray-800 text-gray-100'
const toolOff = 'text-gray-400 hover:text-gray-100'

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

  const mode = useRecorderSettings((s) => s.mode)
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
      <h1 className="text-2xl font-semibold text-white">Screen Recorder</h1>
      <p className="mt-2 text-gray-400">
        Record your screen or webcam directly in the browser. Recordings are saved locally.
      </p>

      {!permissions.ready || !permissions.stream ? (
        <PermissionGate
          camera={permissions.camera}
          microphone={permissions.microphone}
          requesting={permissions.requesting}
          error={permissions.error}
          onRequest={() => void permissions.request()}
        />
      ) : (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Recording mode"
              className="flex gap-1 rounded-lg border border-gray-800 p-1"
            >
              {MODES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  disabled={isActive}
                  onClick={() => setMode(value)}
                  className={`${toolButton} ${mode === value ? 'bg-indigo-600 text-white' : toolOff}`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
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
                {micEnabled ? <Mic size={15} /> : <MicOff size={15} className="text-red-400" />}
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

          <div className="flex items-center gap-4">
            {isRecording ? (
              <button
                type="button"
                onClick={stop}
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                <Square size={15} fill="currentColor" />
                Stop recording
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                disabled={isBusy}
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
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
              <span className="flex items-center gap-2 text-sm text-red-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <RecordingTimer />
              </span>
            )}

            {mode === 'screen' && !isActive && (
              <span className="text-xs text-gray-500">Drag the webcam bubble to position it.</span>
            )}
          </div>

          {status === 'error' && error && (
            <p role="alert" className="text-sm text-red-400">
              Recording failed: {error.message}
            </p>
          )}
        </div>
      )}

      <RecordingsList />
    </div>
  )
}
