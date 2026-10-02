import { Camera, Loader2, Mic, ShieldCheck, type LucideIcon } from 'lucide-react'

import { Button } from '@/shared/ui/Button'
import { InlineError } from '@/shared/ui/InlineError'

import type { DevicePermission } from '../hooks/useMediaPermissions'

interface PermissionGateProps {
  camera: DevicePermission
  microphone: DevicePermission
  requesting: boolean
  error: string | null
  onRequest: () => void
}

const LABELS: Record<DevicePermission, { text: string; className: string }> = {
  checking: { text: 'Checking…', className: 'text-muted' },
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
    <li className="flex h-12 items-center justify-between border-b border-line px-1 last:border-b-0">
      <span className="flex items-center gap-2.5 text-sm text-ink">
        <Icon size={17} className="text-muted" />
        {name}
      </span>
      <span className={`text-sm font-medium ${label.className}`}>{label.text}</span>
    </li>
  )
}

/** Rendered inside the recorder card, so it uses inset materials only. */
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
    <div className="flex max-w-md flex-col items-start py-2">
      <span className="text-accent">
        <ShieldCheck size={26} />
      </span>
      <h2 className="mt-4 text-lg font-medium">Allow camera and microphone</h2>
      <p className="mt-2 text-sm text-muted">
        The recorder needs both. You can turn the mic off or hide your webcam before you start.
      </p>

      <ul className="mt-5 w-full border-y border-line">
        <DeviceRow icon={Camera} name="Camera" state={camera} />
        <DeviceRow icon={Mic} name="Microphone" state={microphone} />
      </ul>

      {unsupported ? (
        <InlineError className="mt-6 w-full text-left">
          This browser can’t access a camera or microphone here. Use a recent Chrome, Edge or
          Firefox over HTTPS or localhost.
        </InlineError>
      ) : (
        <Button
          variant="primary"
          size="lg"
          onClick={onRequest}
          disabled={requesting || checking}
          icon={requesting ? <Loader2 size={18} className="animate-spin" /> : undefined}
          className="mt-6"
        >
          {requesting ? 'Waiting for permission…' : 'Grant access'}
        </Button>
      )}

      {error && <InlineError className="mt-4 w-full text-left">{error}</InlineError>}
    </div>
  )
}
