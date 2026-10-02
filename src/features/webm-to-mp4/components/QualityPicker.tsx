import { useRef, type KeyboardEvent } from 'react'

import { Segmented } from '@/shared/ui/Segmented'

import {
  RESOLUTION_CHOICES,
  isResolutionAvailable,
  outputDimensions,
  type CompressionChoice,
  type ResolutionChoice,
  type VideoDimensions,
} from '../lib/args'

const COMPRESSION_OPTIONS: { value: CompressionChoice; label: string; title: string }[] = [
  { value: 'small', label: 'Smaller file', title: 'CRF 28' },
  { value: 'balanced', label: 'Balanced', title: 'CRF 23' },
  { value: 'best', label: 'Best quality', title: 'CRF 18' },
]

interface QualityPickerProps {
  source: VideoDimensions | null
  resolution: ResolutionChoice
  compression: CompressionChoice
  onResolutionChange: (value: ResolutionChoice) => void
  onCompressionChange: (value: CompressionChoice) => void
  disabled?: boolean
}

/** Resolution as selectable cards (a radiogroup with arrow-key navigation) plus compression. */
export function QualityPicker({
  source,
  resolution,
  compression,
  onResolutionChange,
  onCompressionChange,
  disabled = false,
}: QualityPickerProps) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const options = RESOLUTION_CHOICES.map((choice) => ({
    ...choice,
    available: isResolutionAvailable(choice.value, source),
  }))
  const index = options.findIndex((o) => o.value === resolution)

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    for (let i = 1; i <= options.length; i++) {
      const next = (index + step * i + options.length) % options.length
      const option = options[next]
      if (option?.available) {
        onResolutionChange(option.value)
        buttonsRef.current[next]?.focus()
        return
      }
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset disabled={disabled}>
        <legend
          id="resolution-label"
          className="mb-2 font-mono text-[11px] tracking-[0.06em] text-muted uppercase"
        >
          Resolution
        </legend>
        <div
          role="radiogroup"
          aria-labelledby="resolution-label"
          onKeyDown={onKeyDown}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {options.map((option, i) => {
            const selected = option.value === resolution
            const dims = source && option.available ? outputDimensions(option.value, source) : null
            return (
              <button
                key={option.value}
                ref={(el) => {
                  buttonsRef.current[i] = el
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                disabled={!option.available}
                title={option.available ? undefined : 'Larger than the source — never upscaled'}
                onClick={() => onResolutionChange(option.value)}
                className={`flex flex-col items-start gap-0.5 rounded-control border px-3.5 py-3 text-left transition-[background-color,border-color,transform] duration-150 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 ${
                  selected ? 'border-ink bg-ink text-paper' : 'border-line hover:bg-surface-2'
                }`}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  className={`font-mono text-xs tabular-nums ${selected ? 'opacity-75' : 'text-muted'}`}
                >
                  {dims ? `${dims.width}×${dims.height}` : option.available ? '—' : 'Too large'}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div>
        <span
          id="compression-label"
          className="mb-2 block font-mono text-[11px] tracking-[0.06em] text-muted uppercase"
        >
          Compression
        </span>
        <Segmented<CompressionChoice>
          aria-label="Compression"
          value={compression}
          onChange={onCompressionChange}
          options={COMPRESSION_OPTIONS}
          disabled={disabled}
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  )
}
