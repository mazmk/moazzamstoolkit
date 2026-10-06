import unrarWasmUrl from 'node-unrar-js/esm/js/unrar.wasm?url'

import type { ArchiveErrorKind } from './archive'
import type { ArchiveKind } from './formats'
import type { ArchiveResponse, ExtractedEntry, ZipRequest, ZipResponse } from './protocol'

export interface ExtractHandlers {
  onPlanned: (total: number, ignored: number) => void
  onEntries: (entries: ExtractedEntry[], done: number) => void
}

export class ArchiveError extends Error {
  readonly kind: ArchiveErrorKind
  constructor(kind: ArchiveErrorKind) {
    super(kind)
    this.name = 'ArchiveError'
    this.kind = kind
  }
}

/**
 * Unpacks a ZIP or RAR in its own worker, terminated when done. The RAR library (and its WASM)
 * is only imported by the worker when a .rar is opened.
 */
export function extractArchive(
  file: Blob,
  name: string,
  kind: ArchiveKind,
  handlers: ExtractHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/archive.worker.ts', import.meta.url), {
      type: 'module',
      name: 'image-compress-archive',
    })
    const finish = (error?: Error) => {
      worker.terminate()
      signal?.removeEventListener('abort', onAbort)
      if (error) reject(error)
      else resolve()
    }
    const onAbort = () => finish(new ArchiveError('corrupt'))
    signal?.addEventListener('abort', onAbort, { once: true })
    worker.onmessage = (event: MessageEvent<ArchiveResponse>) => {
      const message = event.data
      if (message.type === 'planned') handlers.onPlanned(message.total, message.ignored)
      else if (message.type === 'entries') handlers.onEntries(message.entries, message.done)
      else if (message.type === 'finished') finish()
      else finish(new ArchiveError(message.error))
    }
    worker.onerror = () => finish(new ArchiveError('memory'))
    // Resolved here so Vite fingerprints and copies the file; fetched only for RAR.
    const wasm = kind === 'rar' ? new URL(unrarWasmUrl, location.href).href : undefined
    worker.postMessage({ file, name, kind, unrarWasmUrl: wasm })
  })
}

/** Builds a stored ZIP in a worker. */
export function buildZip(
  files: ZipRequest['files'],
  onProgress: (done: number, total: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/zip.worker.ts', import.meta.url), {
      type: 'module',
      name: 'image-compress-zip',
    })
    worker.onmessage = (event: MessageEvent<ZipResponse>) => {
      const message = event.data
      if (message.type === 'progress') {
        onProgress(message.done, message.total)
        return
      }
      worker.terminate()
      if (message.type === 'done') resolve(message.blob)
      else reject(new Error(message.message))
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Building the ZIP failed (possibly out of memory).'))
    }
    worker.postMessage({ files } satisfies ZipRequest)
  })
}
