import { useId } from 'react'

import { Chip } from '@/shared/ui/Chip'

import { QUALITY_PRESETS } from '../lib/settings'

interface QualityControlProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

/** The batch quality slider (0–100, step 1) with Low/Medium/High presets. */
export function QualityControl({ value, onChange, disabled = false }: QualityControlProps) {
  const id = useId()
  return (
    <div className={disabled ? 'opacity-45' : ''}>
      <label htmlFor={id} className="block text-sm">
        <span className="font-medium">Quality</span>{' '}
        <span className="font-mono tabular-nums">{value}%</span>{' '}
        <span className="text-muted">· lower = smaller file</span>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`Quality ${value}%`}
        className="mt-2 h-6 w-full cursor-pointer accent-accent disabled:cursor-not-allowed"
      />
      <div role="group" aria-label="Quality presets" className="mt-2 flex flex-wrap gap-1.5">
        {QUALITY_PRESETS.map((preset) => (
          <Chip
            key={preset.value}
            pressed={value === preset.value}
            disabled={disabled}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
            <span className="font-mono text-[11px] opacity-75">{preset.value}</span>
          </Chip>
        ))}
      </div>
    </div>
  )
}
