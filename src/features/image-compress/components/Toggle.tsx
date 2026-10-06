import { useId, type ReactNode } from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

/** A labelled switch (role="switch"). On is ink-filled, like other selected states. */
export function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
  const labelId = useId()
  const descriptionId = useId()
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span id={labelId} className="block text-sm font-medium">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="mt-0.5 block text-xs text-muted">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-45 ${
          checked ? 'border-ink bg-ink' : 'border-line bg-surface-2'
        }`}
      >
        <span
          aria-hidden
          className={`size-3.5 rounded-full transition-transform duration-150 ease-out ${
            checked ? 'translate-x-[18px] bg-paper' : 'translate-x-[2px] bg-muted'
          }`}
        />
      </button>
    </div>
  )
}
