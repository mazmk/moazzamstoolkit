import { useCallback, useEffect, useRef } from 'react'

import { toast } from '@/shared/ui/Toast'

import { archiveErrorMessage, isJunkPath, splitPath } from '../lib/archive'
import type { IncomingFile } from '../lib/fileInput'
import { INPUT_MIME, archiveKind, formatFromName } from '../lib/formats'
import { ArchiveError, extractArchive } from '../lib/workerClients'
import { useBatchStore, type NewItem } from './useBatchStore'

/** Files this big are accepted but warned about: slow, and memory-hungry to decode. */
export const LARGE_FILE_BYTES = 50 * 1024 * 1024

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

let archiveCounter = 1

/**
 * Sorts incoming files into images, archives and everything else. Images join the batch at once;
 * archives are unpacked one at a time (bounded memory), each image joining as it's extracted.
 */
export function useAddFiles() {
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller
    return () => controller.abort()
  }, [])

  return useCallback(async (incoming: IncomingFile[]) => {
    const store = useBatchStore.getState()
    const images: NewItem[] = []
    const archives: IncomingFile[] = []
    let unsupported = 0
    let large = 0

    for (const entry of incoming) {
      const { file } = entry
      if (archiveKind(file.name, file.type)) {
        archives.push(entry)
        continue
      }
      const format = formatFromName(file.name, file.type)
      if (!format) {
        if (!isJunkPath(file.name)) unsupported++
        continue
      }
      if (file.size > LARGE_FILE_BYTES) large++
      images.push({
        file,
        name: file.name || `pasted-image.${format === 'jpeg' ? 'jpg' : format}`,
        dir: entry.dir,
        source: entry.fromFolder ? { kind: 'folder' } : { kind: 'file' },
        format,
      })
    }

    if (images.length) store.addItems(images)
    if (unsupported) toast(`${plural(unsupported, 'unsupported file')} ignored.`)
    if (large) {
      toast(`${plural(large, 'image')} over 50 MB: these can be slow and use a lot of memory.`)
    }

    for (const { file } of archives) {
      const signal = abortRef.current?.signal
      if (signal?.aborted) return
      const kind = archiveKind(file.name, file.type)!
      const id = `archive-${archiveCounter++}`
      let added = 0
      let skipped = 0
      store.setArchive({ id, name: file.name, done: 0, total: null })
      try {
        await extractArchive(
          file,
          file.name,
          kind,
          {
            onPlanned: (total, ignored) => {
              skipped = ignored
              store.setArchive({ id, name: file.name, done: 0, total })
            },
            onEntries: (entries, done) => {
              if (signal?.aborted) return
              const items = entries.flatMap((entry): NewItem[] => {
                const format = formatFromName(entry.path)
                if (!format) return []
                const { dir, name } = splitPath(entry.path)
                return [
                  {
                    file: new Blob([entry.data], { type: INPUT_MIME[format] }),
                    name,
                    dir,
                    source: { kind: 'archive', archive: file.name },
                    format,
                  },
                ]
              })
              added += items.length
              useBatchStore.getState().addItems(items)
              const progress = useBatchStore.getState().archives.find((a) => a.id === id)
              store.setArchive({ id, name: file.name, done, total: progress?.total ?? null })
            },
          },
          signal,
        )
        const note = skipped ? ` (${plural(skipped, 'other file')} ignored)` : ''
        toast(`Added ${plural(added, 'image')} from ${file.name}${note}.`, 'success')
      } catch (err) {
        if (signal?.aborted) return
        toast(
          archiveErrorMessage(err instanceof ArchiveError ? err.kind : 'corrupt', file.name),
          'error',
        )
      } finally {
        store.setArchive({ id, remove: true })
      }
    }
  }, [])
}
