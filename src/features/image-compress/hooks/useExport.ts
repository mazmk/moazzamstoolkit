import { useCallback, useMemo } from 'react'
import { create } from 'zustand'

import { toast } from '@/shared/ui/Toast'

import { formatBytes } from '../lib/bytes'
import { zipFileName } from '../lib/filename'
import { assignOutputPaths } from '../lib/outputs'
import { MAX_ZIP_BYTES, SaveCancelled, downloadBlob, saveToFolder } from '../lib/saveFiles'
import { buildZip } from '../lib/workerClients'
import { useBatchStore, type BatchItem } from './useBatchStore'

export interface ExportProgress {
  label: string
  done: number
  total: number
}

/** Shared so the summary bar and list toolbar show the same in-progress export. */
const useExportProgress = create<{ progress: ExportProgress | null }>(() => ({ progress: null }))
const setProgress = (progress: ExportProgress | null) => useExportProgress.setState({ progress })

const plural = (n: number) => `${n} image${n === 1 ? '' : 's'}`

export function useExport() {
  const items = useBatchStore((s) => s.items)
  const filename = useBatchStore((s) => s.settings.filename)
  const keepFolders = useBatchStore((s) => s.settings.keepFolders)
  const progress = useExportProgress((s) => s.progress)

  const paths = useMemo(
    () => assignOutputPaths(items, filename, keepFolders),
    [items, filename, keepFolders],
  )

  const filesFor = useCallback(
    (ids?: ReadonlySet<string>) =>
      items
        .filter((i): i is BatchItem & { result: NonNullable<BatchItem['result']> } =>
          Boolean(i.result && (!ids || ids.has(i.id))),
        )
        .map((i) => ({ path: paths.get(i.id)!, blob: i.result.blob })),
    [items, paths],
  )

  const downloadOne = useCallback(
    (item: BatchItem) => {
      const path = paths.get(item.id)
      if (!item.result || !path) return
      downloadBlob(item.result.blob, path.slice(path.lastIndexOf('/') + 1))
    },
    [paths],
  )

  const downloadZip = useCallback(
    async (ids?: ReadonlySet<string>) => {
      const files = filesFor(ids)
      if (files.length === 0) return
      if (files.length === 1) {
        const [only] = files
        downloadBlob(only!.blob, only!.path.slice(only!.path.lastIndexOf('/') + 1))
        return
      }
      const total = files.reduce((n, f) => n + f.blob.size, 0)
      if (total > MAX_ZIP_BYTES) {
        toast(
          `${formatBytes(total)} is too big for one ZIP. Use “Save to folder”, or download in smaller selections.`,
          'error',
        )
        return
      }
      setProgress({ label: 'Building ZIP', done: 0, total: files.length })
      try {
        const zip = await buildZip(files, (done) =>
          setProgress({ label: 'Building ZIP', done, total: files.length }),
        )
        downloadBlob(zip, zipFileName())
        toast(`ZIP of ${plural(files.length)} ready (${formatBytes(zip.size)}).`, 'success')
      } catch (err) {
        toast(
          `Couldn’t build the ZIP: ${err instanceof Error ? err.message : 'unknown error'}`,
          'error',
        )
      } finally {
        setProgress(null)
      }
    },
    [filesFor],
  )

  const saveFolder = useCallback(
    async (ids?: ReadonlySet<string>) => {
      const files = filesFor(ids)
      if (files.length === 0) return
      try {
        await saveToFolder(files, (done, total) =>
          setProgress({ label: 'Saving to folder', done, total }),
        )
        toast(`Saved ${plural(files.length)}.`, 'success')
      } catch (err) {
        if (!(err instanceof SaveCancelled)) {
          toast(`Couldn’t save: ${err instanceof Error ? err.message : 'unknown error'}`, 'error')
        }
      } finally {
        setProgress(null)
      }
    },
    [filesFor],
  )

  return { paths, progress, downloadOne, downloadZip, saveFolder }
}
