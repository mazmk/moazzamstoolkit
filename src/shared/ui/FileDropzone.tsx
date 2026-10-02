import { Upload } from 'lucide-react'
import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react'

import { Button } from './Button'

interface FileDropzoneProps {
  /** Passed to the file input, e.g. ".webm,video/webm". */
  accept: string
  onFiles: (files: File[]) => void
  title: string
  hint?: ReactNode
  buttonLabel?: string
  multiple?: boolean
  disabled?: boolean
  icon?: ReactNode
}

/**
 * Drag-and-drop target plus a "Choose file" button. The button is the keyboard path; the drop
 * area itself is a convenience for pointer users. Validation is left to `onFiles`.
 */
export function FileDropzone({
  accept,
  onFiles,
  title,
  hint,
  buttonLabel = 'Choose file',
  multiple = false,
  disabled = false,
  icon,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const hintId = useId()

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        // Ignore leave events fired when moving between children.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={handleDrop}
      data-dragging={dragging || undefined}
      className="flex flex-col items-center gap-4 rounded-panel border-[1.5px] border-dashed border-line px-6 py-12 text-center transition-[border-color,background-color] duration-150 ease-out hover:border-accent hover:bg-accent-tint data-dragging:border-accent data-dragging:bg-accent-tint sm:py-14"
    >
      <span className="text-accent">{icon ?? <Upload size={28} aria-hidden />}</span>
      <div>
        <p className="text-base font-medium">{dragging ? 'Drop to add' : title}</p>
        {hint && (
          <p id={hintId} className="mt-1 text-sm text-muted">
            {hint}
          </p>
        )}
      </div>
      <Button
        variant="primary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-describedby={hint ? hintId : undefined}
      >
        {buttonLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = '' // allow re-selecting the same file
          if (files.length) onFiles(files)
        }}
      />
    </div>
  )
}
