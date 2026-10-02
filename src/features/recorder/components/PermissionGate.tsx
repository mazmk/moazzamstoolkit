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
  checking: { text: 'Checking…', className: 'text-gray-400' },
  prompt: { text: 'Not granted', className: 'text-amber-400' },
  granted: { text: 'Granted', className: 'text-emerald-400' },
  denied: { text: 'Blocked', className: 'text-red-400' },
  unsupported: { text: 'Unsupported', className: 'text-red-400' },
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
      <span className="flex items-center gap-2 text-sm text-gray-100">
        <Icon size={16} className="text-gray-400" />
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
    <div className="mt-8 max-w-md rounded-lg border border-gray-800 p-6">
      <h2 className="text-lg font-medium text-white">Allow camera and microphone</h2>
      <p className="mt-1 text-sm text-gray-400">
        ScreenNest needs both to record. You can turn the mic off or hide your webcam before you
        start recording.
      </p>

      <ul className="mt-5 divide-y divide-gray-800 rounded-md border border-gray-800">
        <DeviceRow icon={Camera} name="Camera" state={camera} />
        <DeviceRow icon={Mic} name="Microphone" state={microphone} />
      </ul>

      {unsupported ? (
        <p className="mt-4 text-sm text-red-400">
          This browser can’t access a camera or microphone here. Use a recent Chrome, Edge or
          Firefox over HTTPS or localhost.
        </p>
      ) : (
        <button
          type="button"
          onClick={onRequest}
          disabled={requesting || checking}
          className="mt-5 flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {requesting && <Loader2 size={15} className="animate-spin" />}
          {requesting ? 'Waiting for permission…' : 'Grant access'}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
