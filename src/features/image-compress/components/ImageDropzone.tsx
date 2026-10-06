import { FolderOpen, ImagePlus, ImageDown } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'

import { Button } from '@/shared/ui/Button'

import { fromDataTransfer, fromFileList, type IncomingFile } from '../lib/fileInput'
import { ACCEPT } from '../lib/formats'

interface ImageDropzoneProps {
  onFiles: (files: IncomingFile[]) => void
  /** A one-line bar once images are in the list. */
  compact?: boolean
}

const isMac = () => typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform)

/**
 * Drop target for files, folders and archives, plus "Choose files" and "Choose folder" buttons
 * (the keyboard path). Dropped folders are walked recursively, keeping their relative paths.
 */
export function ImageDropzone({ onFiles, compact = false }: ImageDropzoneProps) {
  const filesRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const hintId = useId()
  const paste = isMac() ? '⌘V' : 'Ctrl+V'

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    // Entries must be read synchronously, before the DataTransfer is cleared.
    void fromDataTransfer(e.dataTransfer).then((files) => files.length && onFiles(files))
  }

  const pick = (input: HTMLInputElement | null) => {
    const files = input?.files
    if (files?.length) onFiles(fromFileList(files))
    if (input) input.value = '' // allow re-picking the same files
  }

  const buttons = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="primary"
        size={compact ? 'sm' : 'md'}
        icon={<ImagePlus size={compact ? 14 : 16} />}
        onClick={() => filesRef.current?.click()}
        aria-describedby={hintId}
      >
        Choose files
      </Button>
      <Button
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        icon={<FolderOpen size={compact ? 14 : 16} />}
        onClick={() => folderRef.current?.click()}
      >
        Choose folder
      </Button>
      <input
        ref={filesRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => pick(e.currentTarget)}
      />
      <input
        ref={(el) => {
          folderRef.current = el
          // Not a React prop; set it directly so the picker selects folders.
          if (el) el.webkitdirectory = true
        }}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => pick(e.currentTarget)}
      />
    </div>
  )

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={onDrop}
      data-dragging={dragging || undefined}
      className={`rounded-panel border-[1.5px] border-dashed border-line transition-[border-color,background-color] duration-150 ease-out hover:border-accent data-dragging:border-accent data-dragging:bg-accent-tint ${
        compact
          ? 'flex flex-wrap items-center justify-between gap-3 px-4 py-3'
          : 'flex flex-col items-center gap-4 px-6 py-12 text-center sm:py-14'
      }`}
    >
      {compact ? (
        <p className="flex items-center gap-2 text-sm">
          <ImageDown size={18} className="shrink-0 text-accent" aria-hidden />
          <span>{dragging ? 'Drop to add' : 'Drop more images, folders or archives'}</span>
          <span id={hintId} className="hidden font-mono text-xs text-muted sm:inline">
            · paste {paste}
          </span>
        </p>
      ) : (
        <>
          <ImageDown size={28} className="text-accent" aria-hidden />
          <div>
            <p className="text-base font-medium">
              {dragging ? 'Drop to add' : 'Drop images, folders, ZIP or RAR files'}
            </p>
            <p id={hintId} className="mt-1 text-sm text-muted">
              JPEG, PNG, WebP, AVIF, BMP, GIF and HEIC (where your browser supports it). Or paste
              with <kbd className="font-mono text-xs">{paste}</kbd>.
            </p>
          </div>
        </>
      )}
      {buttons}
    </div>
  )
}
