import { Eye, EyeOff, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { formatDuration } from '@/shared/lib/format'
import { GlassButton } from '@/shared/ui/GlassButton'
import { InsideGlassContext } from '@/shared/ui/glassContext'

interface RecordingSessionProps {
  showWebcamToggle: boolean
  webcamVisible: boolean
  onToggleWebcam: () => void
  onStop: () => void
}

// Mounted only while recording, so elapsed time starts at 0:00 every time.
function useElapsed() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const startedAt = Date.now()
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 250)
    return () => clearInterval(id)
  }, [])
  return elapsed
}

function RecordingDot() {
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full bg-recording motion-safe:animate-[recording-pulse_1.6s_ease-in-out_infinite]"
    />
  )
}

/**
 * The in-card timer plus a floating control bar pinned to the bottom of the viewport. The bar is
 * portalled to <body>: the recorder card's backdrop-filter would otherwise become the containing
 * block for `position: fixed`, and nesting it would also nest backdrop-filters.
 */
export function RecordingSession({
  showWebcamToggle,
  webcamVisible,
  onToggleWebcam,
  onStop,
}: RecordingSessionProps) {
  const time = formatDuration(useElapsed())

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <span className="flex items-center gap-2 text-sm font-medium text-danger">
          <RecordingDot />
          Recording
        </span>
        <span
          role="timer"
          aria-label={`Elapsed ${time}`}
          className="font-mono text-6xl font-medium tracking-tight tabular-nums sm:text-7xl"
        >
          {time}
        </span>
      </div>

      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div
            role="toolbar"
            aria-label="Recording controls"
            className="glass-strong pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5 pl-4 motion-safe:animate-[toast-in_300ms_var(--ease-spring)]"
          >
            <InsideGlassContext value>
              <RecordingDot />
              <span aria-hidden className="mr-2 ml-1 font-mono text-sm tabular-nums">
                {time}
              </span>
              {showWebcamToggle && (
                <GlassButton
                  variant="ghost"
                  size="icon"
                  aria-label={webcamVisible ? 'Hide webcam' : 'Show webcam'}
                  aria-pressed={webcamVisible}
                  title={webcamVisible ? 'Hide webcam' : 'Show webcam'}
                  onClick={onToggleWebcam}
                  icon={webcamVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                />
              )}
              <GlassButton
                variant="danger"
                onClick={onStop}
                icon={<Square size={14} fill="currentColor" />}
              >
                Stop
              </GlassButton>
            </InsideGlassContext>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
