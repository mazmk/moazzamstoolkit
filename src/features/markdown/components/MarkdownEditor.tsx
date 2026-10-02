import { useRef, useState, type DragEvent, type KeyboardEvent, type Ref } from 'react'

import { toast } from '@/shared/ui/Toast'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onScroll: () => void
  textareaRef: Ref<HTMLTextAreaElement>
}

const TEXT_FILE = /\.(md|markdown|mdown|txt)$/i
const INDENT = '  '

/** Inserts text at the cursor, keeping the browser's undo history where supported. */
function insertAtCursor(el: HTMLTextAreaElement, text: string) {
  el.focus()
  // execCommand is deprecated but is still the only way to keep native undo for textarea edits.
  const inserted =
    typeof document.execCommand === 'function' && document.execCommand('insertText', false, text)
  if (!inserted) el.setRangeText(text, el.selectionStart, el.selectionEnd, 'end')
}

/**
 * Plain monospace textarea. Tab inserts two spaces; press Esc first to let Tab move focus out, so
 * keyboard users are never trapped. Drop a .md/.txt file to load it.
 */
export function MarkdownEditor({ value, onChange, onScroll, textareaRef }: MarkdownEditorProps) {
  const [dragging, setDragging] = useState(false)
  const tabEscapesRef = useRef(false)

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      tabEscapesRef.current = true
      return
    }
    if (e.key === 'Tab' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (tabEscapesRef.current) {
        tabEscapesRef.current = false
        return // let focus move on
      }
      e.preventDefault()
      insertAtCursor(e.currentTarget, INDENT)
      onChange(e.currentTarget.value)
      return
    }
    tabEscapesRef.current = false
  }

  const onDrop = async (e: DragEvent<HTMLTextAreaElement>) => {
    const file = e.dataTransfer.files[0]
    if (!file) return // plain text drags behave normally
    e.preventDefault()
    setDragging(false)
    if (!TEXT_FILE.test(file.name) && !file.type.startsWith('text/')) {
      toast(`“${file.name}” isn’t a markdown or text file.`, 'error')
      return
    }
    onChange(await file.text())
    toast(`Loaded ${file.name}`, 'success')
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onScroll={onScroll}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => void onDrop(e)}
      aria-label="Markdown source"
      aria-describedby="editor-help"
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      data-dragging={dragging || undefined}
      className="h-full min-h-0 w-full flex-1 resize-none bg-transparent p-5 font-mono text-[13.5px] leading-relaxed [tab-size:2] text-ink outline-none placeholder:text-muted data-dragging:bg-accent-tint sm:p-6"
      placeholder="Write markdown here, or drop a .md file…"
    />
  )
}
