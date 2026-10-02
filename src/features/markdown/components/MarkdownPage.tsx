import { useDeferredValue, useMemo, useRef, useState } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { Panel } from '@/shared/ui/Panel'
import { SplitPane } from '@/shared/ui/SplitPane'
import { toast } from '@/shared/ui/Toast'

import { documentStats } from '../lib/document'
import { copyHtml, exportHtml, exportMarkdown, printAsPdf } from '../lib/exporters'
import { useMarkdownDocument } from '../lib/useMarkdownDocument'
import { MarkdownEditor } from './MarkdownEditor'
import { MarkdownPreview } from './MarkdownPreview'
import { MarkdownToolbar, type MobileTab } from './MarkdownToolbar'

// Panes clip their content, so the focus ring is drawn on the pane rather than the textarea/region.
const PANE =
  'flex min-h-0 flex-1 flex-col overflow-hidden has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent has-[textarea:focus]:outline-2 has-[textarea:focus]:outline-offset-2 has-[textarea:focus]:outline-accent'

const SYNC_KEY = 'toolkit:markdown:sync-scroll'
const SPLIT_KEY = 'toolkit:markdown:split'

const readSync = () => {
  try {
    return localStorage.getItem(SYNC_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Fraction of the way through a scroll container's scrollable range. */
const scrollFraction = (el: HTMLElement) => {
  const range = el.scrollHeight - el.clientHeight
  return range > 0 ? el.scrollTop / range : 0
}
const scrollToFraction = (el: HTMLElement, fraction: number) => {
  el.scrollTop = fraction * (el.scrollHeight - el.clientHeight)
}

export default function MarkdownPage() {
  const { text, setText, reset, savedAt } = useMarkdownDocument()
  const deferredText = useDeferredValue(text)
  const stats = useMemo(() => documentStats(deferredText), [deferredText])

  const compact = useMediaQuery('(max-width: 899px)')
  const [tab, setTab] = useState<MobileTab>('edit')
  const [syncScroll, setSyncScroll] = useState(readSync)
  const [confirmReset, setConfirmReset] = useState(false)

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  // Which pane started the current programmatic scroll, so its mirror doesn't echo back.
  const scrollSourceRef = useRef<'editor' | 'preview' | null>(null)

  const mirror = (from: 'editor' | 'preview') => {
    if (!syncScroll || compact) return
    if (scrollSourceRef.current && scrollSourceRef.current !== from) {
      scrollSourceRef.current = null // this event is the echo of our own scroll
      return
    }
    const source = from === 'editor' ? editorRef.current : previewScrollRef.current
    const target = from === 'editor' ? previewScrollRef.current : editorRef.current
    if (!source || !target) return
    scrollSourceRef.current = from
    scrollToFraction(target, scrollFraction(source))
    requestAnimationFrame(() => {
      if (scrollSourceRef.current === from) scrollSourceRef.current = null
    })
  }

  const setSync = (on: boolean) => {
    setSyncScroll(on)
    try {
      localStorage.setItem(SYNC_KEY, on ? 'on' : 'off')
    } catch {
      // preference just won't persist
    }
  }

  // Exports read the rendered preview, which is always mounted (hidden on the Edit tab).
  const bodyHtml = () => articleRef.current?.innerHTML ?? ''

  const editorPane = (
    <Panel className={PANE}>
      <MarkdownEditor
        value={text}
        onChange={setText}
        onScroll={() => mirror('editor')}
        textareaRef={editorRef}
      />
    </Panel>
  )
  const previewPane = (
    <Panel className={PANE}>
      <MarkdownPreview
        markdown={deferredText}
        scrollRef={previewScrollRef}
        articleRef={articleRef}
        onScroll={() => mirror('preview')}
      />
    </Panel>
  )

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3">
      <div className="border-b border-line pb-3">
        <MarkdownToolbar
          compact={compact}
          tab={tab}
          onTabChange={setTab}
          syncScroll={syncScroll}
          onSyncScrollChange={setSync}
          onExportMarkdown={() => exportMarkdown(text)}
          onExportHtml={() => exportHtml(text, bodyHtml())}
          onExportPdf={() =>
            printAsPdf(text, bodyHtml()).catch(() =>
              toast('Printing isn’t available in this browser.', 'error'),
            )
          }
          onCopyHtml={() =>
            copyHtml(bodyHtml()).then(
              () => toast('HTML copied to the clipboard', 'success'),
              () => toast('Couldn’t access the clipboard.', 'error'),
            )
          }
          onReset={() => setConfirmReset(true)}
        />
      </div>

      {compact ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Both panes stay mounted so exports always have rendered HTML to read. */}
          <div className={tab === 'edit' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
            {editorPane}
          </div>
          <div className={tab === 'preview' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
            {previewPane}
          </div>
        </div>
      ) : (
        <SplitPane
          className="flex-1"
          label="Resize editor and preview"
          storageKey={SPLIT_KEY}
          start={editorPane}
          end={previewPane}
        />
      )}

      <footer
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-[11px] text-muted"
        aria-label="Document statistics"
      >
        <span className="font-mono tabular-nums">{stats.words.toLocaleString()} words</span>
        <span className="font-mono tabular-nums">
          {stats.characters.toLocaleString()} characters
        </span>
        <span className="font-mono tabular-nums">
          {stats.readingMinutes ? `~${stats.readingMinutes} min read` : 'Empty'}
        </span>
        <span aria-live="polite">{savedAt ? 'Saved in this browser' : 'Not saved yet'}</span>
        <span id="editor-help" className="ml-auto hidden font-sans text-xs sm:inline">
          Tab indents · Esc then Tab leaves the editor · Drop a .md file to open it
        </span>
      </footer>

      <ConfirmDialog
        open={confirmReset}
        title="Reset the document?"
        description="Your text will be replaced with the sample document. This can’t be undone."
        confirmLabel="Reset"
        tone="danger"
        onConfirm={() => {
          reset()
          setConfirmReset(false)
          toast('Document reset')
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
