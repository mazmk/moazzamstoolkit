import { Camera, Loader2, Mic, type LucideIcon } from 'lucide-react'

import type { DevicePermission } from '../hooks/useMediaPermissions'

interface PermissionGateProps {
  camera: DevicePermission
  microphone: DevicePermission
  requesting: boolean
  error: string | null
  onRequest: () => void
}

const LABELS: Record<DevicePermission, { text: string; className: string }> = {
  checking: { text: 'Checking…', className: 'text-fg-muted' },
  prompt: { text: 'Not granted', className: 'text-warning' },
  granted: { text: 'Granted', className: 'text-success' },
  denied: { text: 'Blocked', className: 'text-danger' },
  unsupported: { text: 'Unsupported', className: 'text-danger' },
}

function DeviceRow({
  icon: Icon,
  name,
  state,
}: {
  icon: LucideIcon
  name: string
  state: DevicePermission
}) {
  const label = LABELS[state]
  return (
    <li className="flex items-center justify-between px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-fg">
        <Icon size={16} className="text-fg-muted" />
        {name}
      </span>
      <span className={`text-sm ${label.className}`}>{label.text}</span>
    </li>
  )
}

export function PermissionGate({
  camera,
  microphone,
  requesting,
  error,
  onRequest,
}: PermissionGateProps) {
  const unsupported = camera === 'unsupported' || microphone === 'unsupported'
  const checking = camera === 'checking' || microphone === 'checking'

  return (
    <div className="mt-6 max-w-md rounded-lg border border-line bg-surface p-4 sm:mt-8 sm:p-6">
      <h2 className="text-lg font-medium text-fg">Allow camera and microphone</h2>
      <p className="mt-1 text-sm text-fg-muted">
        ScreenNest needs both to record. You can turn the mic off or hide your webcam before you
        start recording.
      </p>

      <ul className="mt-5 divide-y divide-line rounded-md border border-line">
        <DeviceRow icon={Camera} name="Camera" state={camera} />
        <DeviceRow icon={Mic} name="Microphone" state={microphone} />
      </ul>

      {unsupported ? (
        <p className="mt-4 text-sm text-danger">
          This browser can’t access a camera or microphone here. Use a recent Chrome, Edge or
          Firefox over HTTPS or localhost.
        </p>
      ) : (
        <button
          type="button"
          onClick={onRequest}
          disabled={requesting || checking}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {requesting && <Loader2 size={15} className="animate-spin" />}
          {requesting ? 'Waiting for permission…' : 'Grant access'}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
