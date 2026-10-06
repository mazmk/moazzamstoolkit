import { ShieldCheck } from 'lucide-react'

import { PageHeader } from '@/shared/ui/PageHeader'
import { Panel } from '@/shared/ui/Panel'
import { Tag } from '@/shared/ui/Tag'

import { useAddFiles } from '../hooks/useAddFiles'
import { useBatchStore } from '../hooks/useBatchStore'
import { useCompressionRunner } from '../hooks/useCompressionRunner'
import { usePasteFiles } from '../hooks/usePasteFiles'
import { CompareDialog } from './CompareDialog'
import { ImageDropzone } from './ImageDropzone'
import { ImageList } from './ImageList'
import { SettingsPanel } from './SettingsPanel'
import { SummaryBar } from './SummaryBar'

export default function ImageCompressPage() {
  const { cancelAll } = useCompressionRunner()
  const addFiles = useAddFiles()
  const hasItems = useBatchStore((s) => s.items.length > 0)
  const unpacking = useBatchStore((s) => s.archives.length > 0)
  usePasteFiles((files) => void addFiles(files))

  return (
    <div>
      <PageHeader
        toolId="image-compress"
        title="Image Compressor"
        description="Shrink a whole batch of photos and graphics at once: pick a quality, resize, convert to WebP or AVIF, and download them all as a ZIP."
        aside={
          <Tag tone="success" mono={false} icon={<ShieldCheck size={14} aria-hidden />}>
            Your images never leave your device
          </Tag>
        }
      />

      {/* One column on phones (drop → settings → list); settings stick beside the list on wide screens.
          The 1fr second row absorbs the tall settings column so the list sits right under the dropzone. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr]">
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <ImageDropzone compact={hasItems} onFiles={(files) => void addFiles(files)} />
        </div>

        <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
          <SettingsPanel />
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          {hasItems || unpacking ? (
            <Panel className="overflow-hidden">
              <SummaryBar onCancel={cancelAll} />
              {hasItems && <ImageList />}
            </Panel>
          ) : (
            <Panel className="p-5 text-sm text-muted">
              <h2 className="font-mono text-[11px] tracking-[0.06em] text-ink uppercase">
                How it works
              </h2>
              <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5">
                <li>Add images, a folder, or a ZIP/RAR archive. Up to thousands at once.</li>
                <li>Set the quality (50% is a good start), format, size and file names.</li>
                <li>
                  Check results with the before/after compare, then download one by one or as a ZIP.
                </li>
              </ol>
            </Panel>
          )}
        </div>
      </div>

      <CompareDialog />
    </div>
  )
}
