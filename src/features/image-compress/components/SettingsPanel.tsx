import { Info, RotateCcw } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { Button } from '@/shared/ui/Button'
import { Chip } from '@/shared/ui/Chip'
import { Panel } from '@/shared/ui/Panel'
import { Segmented } from '@/shared/ui/Segmented'
import { TextField } from '@/shared/ui/TextField'

import { settingsDiffer, useBatchStore } from '../hooks/useBatchStore'
import { buildOutputName } from '../lib/filename'
import { OUTPUT_EXTENSION, type FormatChoice } from '../lib/formats'
import { MAX_DIMENSION_PRESETS, type ResizeMode } from '../lib/resize'
import { AUTO_APPLY_LIMIT } from '../lib/settings'
import { QualityControl } from './QualityControl'
import { Toggle } from './Toggle'

const FORMAT_OPTIONS: { value: FormatChoice; label: string; title: string }[] = [
  {
    value: 'original',
    label: 'Keep',
    title: 'Keep each image’s format (BMP and GIF become PNG, HEIC becomes JPEG)',
  },
  { value: 'jpeg', label: 'JPEG', title: 'JPEG (MozJPEG)' },
  { value: 'webp', label: 'WebP', title: 'WebP' },
  { value: 'avif', label: 'AVIF', title: 'AVIF: smallest files, slowest to encode' },
  { value: 'png', label: 'PNG', title: 'PNG (palette-reduced below quality 100)' },
]

const RESIZE_OPTIONS: { value: ResizeMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'max', label: 'Max size' },
  { value: 'scale', label: 'Scale %' },
]

const labelClass = 'font-mono text-[11px] tracking-[0.06em] text-muted uppercase'

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0"
    >
      <h3 id={id} className={labelClass}>
        {title}
      </h3>
      {children}
    </section>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  step = 1,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  suffix?: string
  step?: number
}) {
  // A local draft lets people type "1920" through the invalid "1" and "19" on the way; only
  // in-range values are committed, and blur snaps the field back to the committed value.
  const [draft, setDraft] = useState(String(value))
  const [committed, setCommitted] = useState(value)
  if (committed !== value) {
    setCommitted(value)
    setDraft(String(value))
  }
  return (
    <TextField
      type="number"
      inputMode="decimal"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = e.target.valueAsNumber
        if (Number.isFinite(n) && n >= min && n <= max) onChange(n)
      }}
      onBlur={() => setDraft(String(value))}
      trailing={suffix && <span className="pr-2 font-mono text-xs text-muted">{suffix}</span>}
      className="font-mono tabular-nums"
    />
  )
}

export function SettingsPanel() {
  const settings = useBatchStore((s) => s.settings)
  const setSettings = useBatchStore((s) => s.setSettings)
  const resetSettings = useBatchStore((s) => s.resetSettings)
  const autoApply = useBatchStore((s) => s.autoApply)
  const setAutoApply = useBatchStore((s) => s.setAutoApply)
  const applySettings = useBatchStore((s) => s.applySettings)
  const count = useBatchStore((s) => s.items.length)
  const pending = useBatchStore((s) => s.items.some((i) => settingsDiffer(i.applied, s.settings)))

  const { resize, filename, target } = settings
  const targetMode = target.enabled
  const showPngNote = settings.format === 'png' || settings.format === 'original'
  const exampleExt = OUTPUT_EXTENSION[settings.format === 'original' ? 'jpeg' : settings.format]
  const customMax = !MAX_DIMENSION_PRESETS.some((p) => p === resize.maxDimension)

  return (
    <Panel as="aside" aria-label="Compression settings" className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">Settings</h2>
        <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={resetSettings}>
          Reset
        </Button>
      </div>

      <Section title="Compression">
        <QualityControl
          value={settings.quality}
          onChange={(quality) => setSettings({ quality })}
          disabled={targetMode}
        />
        {showPngNote && (
          <p className="flex gap-1.5 text-xs text-muted" title="PNG has no real quality setting">
            <Info size={14} className="mt-px shrink-0" aria-hidden />
            <span>
              PNG has no real quality setting: below 100 the colour palette is reduced (lossy), 100
              keeps it lossless. Photos as PNG shrink far more as WebP.
            </span>
          </p>
        )}
        <Toggle
          checked={targetMode}
          onChange={(enabled) => setSettings({ target: { ...target, enabled } })}
          label="Target size"
          description="Compress each image to under a size; quality is picked per image."
        />
        {targetMode && (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <NumberField
                label="Target size per image"
                value={target.value}
                min={1}
                max={100_000}
                step={target.unit === 'MB' ? 0.1 : 10}
                onChange={(value) => setSettings({ target: { ...target, value } })}
              />
            </div>
            <Segmented<'KB' | 'MB'>
              aria-label="Target size unit"
              value={target.unit}
              onChange={(unit) => setSettings({ target: { ...target, unit } })}
              options={[
                { value: 'KB', label: 'KB' },
                { value: 'MB', label: 'MB' },
              ]}
            />
          </div>
        )}
      </Section>

      <Section title="Output format">
        <Segmented<FormatChoice>
          aria-label="Output format"
          value={settings.format}
          onChange={(format) => setSettings({ format })}
          options={FORMAT_OPTIONS}
          size="sm"
          className="w-full"
        />
        {settings.format === 'jpeg' && (
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Background
              <span className="block text-xs text-muted">Fills transparent areas in JPEG</span>
            </span>
            <input
              type="color"
              value={settings.background}
              onChange={(e) => setSettings({ background: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-control border border-line bg-surface p-1"
            />
          </label>
        )}
      </Section>

      <Section title="Resize">
        <Segmented<ResizeMode>
          aria-label="Resize"
          value={resize.mode}
          onChange={(mode) => setSettings({ resize: { ...resize, mode } })}
          options={RESIZE_OPTIONS}
          size="sm"
          className="w-full"
        />
        {resize.mode === 'max' && (
          <>
            <div role="group" aria-label="Longest side" className="flex flex-wrap gap-1.5">
              {MAX_DIMENSION_PRESETS.map((px) => (
                <Chip
                  key={px}
                  pressed={resize.maxDimension === px}
                  onClick={() => setSettings({ resize: { ...resize, maxDimension: px } })}
                >
                  <span className="font-mono tabular-nums">{px}</span>
                </Chip>
              ))}
            </div>
            <NumberField
              label={customMax ? 'Custom longest side' : 'Longest side'}
              value={resize.maxDimension}
              min={16}
              max={16384}
              suffix="px"
              onChange={(maxDimension) => setSettings({ resize: { ...resize, maxDimension } })}
            />
          </>
        )}
        {resize.mode === 'scale' && (
          <NumberField
            label="Scale percent"
            value={resize.scalePercent}
            min={1}
            max={100}
            suffix="%"
            onChange={(scalePercent) => setSettings({ resize: { ...resize, scalePercent } })}
          />
        )}
        {resize.mode !== 'off' && (
          <p className="text-xs text-muted">Never upscales; aspect ratio is kept.</p>
        )}
      </Section>

      <Section title="Privacy">
        <Toggle
          checked={settings.stripMetadata}
          onChange={(stripMetadata) => setSettings({ stripMetadata })}
          label="Strip metadata (EXIF, GPS)"
          description={
            settings.stripMetadata
              ? 'Removes camera details and location so they aren’t shared with your images.'
              : 'Kept for JPEG → JPEG only; other formats always drop it.'
          }
        />
      </Section>

      <Section title="File names">
        <div className="grid grid-cols-2 gap-2">
          <TextField
            aria-label="Prefix"
            placeholder="Prefix"
            value={filename.prefix}
            maxLength={60}
            onChange={(e) => setSettings({ filename: { ...filename, prefix: e.target.value } })}
          />
          <TextField
            aria-label="Suffix"
            placeholder="Suffix"
            value={filename.suffix}
            maxLength={60}
            onChange={(e) => setSettings({ filename: { ...filename, suffix: e.target.value } })}
          />
        </div>
        <div role="group" aria-label="Name options" className="flex flex-wrap gap-1.5">
          <Chip
            pressed={filename.lowercase}
            onClick={() =>
              setSettings({ filename: { ...filename, lowercase: !filename.lowercase } })
            }
          >
            lowercase
          </Chip>
          <Chip
            pressed={filename.slugify}
            onClick={() => setSettings({ filename: { ...filename, slugify: !filename.slugify } })}
          >
            slugify
          </Chip>
          <Chip
            pressed={filename.numbering}
            onClick={() =>
              setSettings({ filename: { ...filename, numbering: !filename.numbering } })
            }
          >
            numbering
          </Chip>
        </div>
        <p className="truncate font-mono text-xs text-muted" aria-live="polite">
          IMG 0042.jpg →{' '}
          {buildOutputName('IMG 0042.jpg', exampleExt, filename, 0, Math.max(1, count))}
        </p>
        <Toggle
          checked={settings.keepFolders}
          onChange={(keepFolders) => setSettings({ keepFolders })}
          label="Keep folder structure"
          description="For images from a folder or archive."
        />
      </Section>

      <Section title="Applying changes">
        <Toggle
          checked={autoApply}
          onChange={setAutoApply}
          disabled={count > AUTO_APPLY_LIMIT}
          label="Apply automatically"
          description={
            count > AUTO_APPLY_LIMIT
              ? `Off for batches over ${AUTO_APPLY_LIMIT} images. Use the button below.`
              : 'Re-compresses changed images half a second after you stop adjusting.'
          }
        />
        {!autoApply && (
          <Button
            variant="primary"
            disabled={!pending}
            onClick={() => applySettings()}
            className="w-full"
          >
            {pending ? 'Apply settings to all' : 'Settings applied'}
          </Button>
        )}
      </Section>
    </Panel>
  )
}
