import { Camera, Circle, Eye, EyeOff, Loader2, Mic, MicOff, Monitor } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Chip } from '@/shared/ui/Chip'
import { Button } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import { PageHeader } from '@/shared/ui/PageHeader'
import { InlineError } from '@/shared/ui/InlineError'
import { Segmented } from '@/shared/ui/Segmented'
import { toast } from '@/shared/ui/Toast'

import { useMediaPermissions } from '../hooks/useMediaPermissions'
import { useScreenRecorder, type RecorderStatus } from '../hooks/useScreenRecorder'
import type { BubbleSize } from '../lib/overlay'
import { useRecorderSettings, useRecorderStore, type RecordingMode } from '../store'
import { CountdownOverlay } from './CountdownOverlay'
import { DeleteRecordingDialog } from './DeleteRecordingDialog'
import { PermissionGate } from './PermissionGate'
import { RecorderStage } from './RecorderStage'
import { RecordingPreview } from './RecordingPreview'
import { RecordingSession } from './RecordingSession'
import { RecordingsList } from './RecordingsList'

const SIZES: { value: BubbleSize; label: string; title: string }[] = [
  { value: 'sm', label: 'S', title: 'Small webcam' },
  { value: 'md', label: 'M', title: 'Medium webcam' },
  { value: 'lg', label: 'L', title: 'Large webcam' },
]

const COUNTDOWN_FROM = 3

// Mobile browsers don't implement getDisplayMedia, so screen capture is desktop-only.
const canCaptureScreen = () =>
  typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function'

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
  const recordings = useRecorderStore((s) => s.recordings)

  const [countdown, setCountdown] = useState<number | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const isRecording = status === 'recording'
  const isBusy = status === 'requesting' || status === 'processing'
  const isActive = isRecording || isBusy || countdown !== null

  // When a recording finishes saving (processing → idle), open it in the preview. Tracked during
  // render (React's "adjust state on prop change" pattern) rather than in an effect.
  const [lastStatus, setLastStatus] = useState<RecorderStatus>(status)
  if (status !== lastStatus) {
    setLastStatus(status)
    if (lastStatus === 'processing' && status === 'idle' && recordings[0]) {
      setPreviewId(recordings[0].id)
      setSavedId(recordings[0].id)
    }
  }

  useEffect(() => {
    if (savedId) toast('Recording saved to this browser', 'success')
  }, [savedId])

  const handleStart = useCallback(() => {
    const camera = permissions.stream
    void start({
      mode,
      camera,
      mic: micEnabled ? (camera?.getAudioTracks()[0] ?? null) : null,
    })
  }, [permissions.stream, start, mode, micEnabled])

  // Screen mode skips the countdown: getDisplayMedia needs a recent user gesture (Safari allows
  // ~1s), and the browser's share picker already gives the user a moment to get ready.
  const beginRecording = () => {
    setPreviewId(null)
    if (mode === 'camera') setCountdown(COUNTDOWN_FROM)
    else handleStart()
  }

  useEffect(() => {
    if (countdown === null) return
    const id = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1)
      } else {
        setCountdown(null)
        handleStart()
      }
    }, 1000)
    return () => clearTimeout(id)
  }, [countdown, handleStart])

  const preview = previewId ? recordings.find((r) => r.id === previewId) : undefined
  const deleting = pendingDelete ? (recordings.find((r) => r.id === pendingDelete) ?? null) : null

  const openPreview = (id: string) => {
    if (isActive) return
    setPreviewId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startLabel =
    status === 'requesting'
      ? mode === 'screen'
        ? 'Choose what to share…'
        : 'Starting…'
      : status === 'processing'
        ? 'Saving…'
        : 'Start recording'

  return (
    <div>
      <PageHeader
        toolId="screen-recorder"
        title="Screen Recorder"
        description="Record your screen or webcam right in the browser. Recordings stay on this device."
      />

      {!screenSupported && permissions.ready && (
        <p className="mb-4 font-mono text-xs text-muted">
          Screen recording needs a desktop browser — webcam works here.
        </p>
      )}

      <Panel className="p-4 sm:p-6">
        {!permissions.ready || !permissions.stream ? (
          <PermissionGate
            camera={permissions.camera}
            microphone={permissions.microphone}
            requesting={permissions.requesting}
            error={permissions.error}
            onRequest={() => void permissions.request()}
          />
        ) : preview && !isActive ? (
          <RecordingPreview
            recording={preview}
            onClose={() => setPreviewId(null)}
            onRerecord={beginRecording}
            onDelete={() => setPendingDelete(preview.id)}
          />
        ) : (
          <div>
            <div className="mb-4 flex justify-center">
              <Segmented<RecordingMode>
                aria-label="Recording mode"
                value={mode}
                onChange={setMode}
                disabled={isActive}
                options={[
                  {
                    value: 'screen',
                    label: 'Screen',
                    icon: <Monitor size={15} />,
                    disabled: !screenSupported,
                    title: screenSupported
                      ? undefined
                      : 'Screen recording isn’t supported on this device',
                  },
                  { value: 'camera', label: 'Webcam test', icon: <Camera size={15} /> },
                ]}
              />
            </div>

            <RecorderStage
              mode={mode}
              camera={permissions.stream}
              screen={screenStream}
              overlay={overlay}
              onOverlayChange={setOverlay}
            />

            <div className="mt-8 flex flex-col items-center gap-6 pb-2">
              {isRecording ? (
                <RecordingSession
                  showWebcamToggle={mode === 'screen'}
                  webcamVisible={overlay.visible}
                  onToggleWebcam={() => setOverlay({ visible: !overlay.visible })}
                  onStop={stop}
                />
              ) : (
                <Button
                  variant="primary"
                  size="xl"
                  onClick={beginRecording}
                  disabled={isBusy || countdown !== null}
                  icon={
                    isBusy ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Circle size={18} fill="currentColor" />
                    )
                  }
                  className="w-full max-w-xs sm:w-auto"
                >
                  {startLabel}
                </Button>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Chip
                  pressed={micEnabled}
                  disabled={isActive}
                  onClick={() => setMicEnabled(!micEnabled)}
                  title={isActive ? 'Change the mic before you start recording' : undefined}
                  icon={micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                >
                  Mic
                </Chip>

                {mode === 'screen' && (
                  <>
                    <Chip
                      pressed={overlay.visible}
                      onClick={() => setOverlay({ visible: !overlay.visible })}
                      icon={overlay.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    >
                      Webcam
                    </Chip>
                    <Segmented<BubbleSize>
                      aria-label="Webcam size"
                      size="sm"
                      value={overlay.size}
                      onChange={(size) => setOverlay({ size })}
                      disabled={!overlay.visible}
                      options={SIZES}
                    />
                  </>
                )}
              </div>

              {mode === 'screen' && !isActive && (
                <p className="text-xs text-muted">Drag the webcam bubble to position it.</p>
              )}

              {status === 'error' && error && (
                <InlineError className="w-full">Recording failed: {error.message}</InlineError>
              )}
            </div>
          </div>
        )}
      </Panel>

      <RecordingsList onOpen={openPreview} />

      {countdown !== null && (
        <CountdownOverlay value={countdown} onCancel={() => setCountdown(null)} />
      )}

      <DeleteRecordingDialog
        recording={deleting}
        onClose={() => setPendingDelete(null)}
        onDeleted={(id) => {
          if (id === previewId) setPreviewId(null)
        }}
      />
    </div>
  )
}
