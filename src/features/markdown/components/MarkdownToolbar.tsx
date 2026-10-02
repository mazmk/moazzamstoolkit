import {
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileCode,
  FileDown,
  FileText,
  Link2,
  Link2Off,
  RotateCcw,
} from 'lucide-react'

import { Chip } from '@/shared/ui/Chip'
import { Button } from '@/shared/ui/Button'
import { Menu } from '@/shared/ui/Menu'
import { Segmented } from '@/shared/ui/Segmented'

export type MobileTab = 'edit' | 'preview'

interface MarkdownToolbarProps {
  compact: boolean
  tab: MobileTab
  onTabChange: (tab: MobileTab) => void
  syncScroll: boolean
  onSyncScrollChange: (on: boolean) => void
  onExportMarkdown: () => void
  onExportHtml: () => void
  onExportPdf: () => void
  onCopyHtml: () => void
  onReset: () => void
}

export function MarkdownToolbar({
  compact,
  tab,
  onTabChange,
  syncScroll,
  onSyncScrollChange,
  onExportMarkdown,
  onExportHtml,
  onExportPdf,
  onCopyHtml,
  onReset,
}: MarkdownToolbarProps) {
  return (
    <div role="toolbar" aria-label="Markdown tools" className="flex items-center gap-2">
      {compact && <h1 className="sr-only">Markdown Viewer</h1>}
      {compact ? (
        <Segmented<MobileTab>
          aria-label="View"
          size="sm"
          value={tab}
          onChange={onTabChange}
          options={[
            { value: 'edit', label: 'Edit', icon: <Code2 size={14} /> },
            { value: 'preview', label: 'Preview', icon: <FileText size={14} /> },
          ]}
        />
      ) : (
        <>
          <h1 className="mr-2 font-display text-[30px] leading-none tracking-[-0.01em]">
            Markdown Viewer
          </h1>
          <Chip
            pressed={syncScroll}
            onClick={() => onSyncScrollChange(!syncScroll)}
            icon={syncScroll ? <Link2 size={15} /> : <Link2Off size={15} />}
            title="Keep the editor and preview scrolled to the same place"
            className="h-8"
          >
            Sync scroll
          </Chip>
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size={compact ? 'icon-sm' : 'sm'}
          onClick={onReset}
          aria-label={compact ? 'Reset document' : undefined}
          title="Replace the document with the sample"
          icon={<RotateCcw size={15} />}
        >
          {!compact && 'Reset'}
        </Button>
        <Button
          variant="ghost"
          size={compact ? 'icon-sm' : 'sm'}
          onClick={onCopyHtml}
          aria-label={compact ? 'Copy HTML' : undefined}
          title="Copy the rendered HTML"
          icon={<Copy size={15} />}
        >
          {!compact && 'Copy HTML'}
        </Button>
        <Menu
          label="Export"
          align="end"
          width={300}
          groups={[
            {
              items: [
                {
                  id: 'md',
                  label: 'Markdown',
                  description: 'The raw text as a .md file',
                  icon: <FileText size={16} />,
                  hint: '.md',
                  onSelect: onExportMarkdown,
                },
                {
                  id: 'html',
                  label: 'Styled HTML',
                  description: 'Self-contained, works offline',
                  icon: <FileCode size={16} />,
                  hint: '.html',
                  onSelect: onExportHtml,
                },
                {
                  id: 'pdf',
                  label: 'PDF',
                  description: 'Print, then pick “Save as PDF”',
                  title: 'Opens the print dialog — choose “Save as PDF” as the destination.',
                  icon: <FileDown size={16} />,
                  hint: 'Print',
                  onSelect: onExportPdf,
                },
              ],
            },
          ]}
          trigger={(props) => (
            <Button
              {...props}
              variant="primary"
              size="sm"
              icon={<Download size={15} />}
              className="gap-1.5"
            >
              Export
              <ChevronDown size={14} aria-hidden />
            </Button>
          )}
        />
      </div>
    </div>
  )
}
