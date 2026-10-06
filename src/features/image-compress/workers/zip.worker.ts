import { Zip, ZipPassThrough } from 'fflate'

import type { ZipRequest, ZipResponse } from '../lib/protocol'

/**
 * Builds the download ZIP off the main thread. Entries are stored, not deflated (level 0):
 * compressed images don't shrink further, and storing is many times faster. Chunks go straight
 * into a Blob, so the archive is never one giant contiguous buffer.
 */

const post = (message: ZipResponse) => self.postMessage(message)

// fflate types chunks loosely; they're always backed by a plain ArrayBuffer in practice.
const ownsBuffer = (u: Uint8Array): u is Uint8Array<ArrayBuffer> => u.buffer instanceof ArrayBuffer

self.onmessage = async (event: MessageEvent<ZipRequest>) => {
  const { files } = event.data
  try {
    const chunks: Uint8Array<ArrayBuffer>[] = []
    let failed: Error | null = null
    const zip = new Zip((err, chunk) => {
      if (err) failed = err
      else chunks.push(ownsBuffer(chunk) ? chunk : new Uint8Array(chunk))
    })
    const mtime = new Date()
    for (const [i, { path, blob }] of files.entries()) {
      const entry = new ZipPassThrough(path)
      entry.mtime = mtime
      zip.add(entry)
      entry.push(new Uint8Array(await blob.arrayBuffer()), true)
      if (failed) throw failed
      post({ type: 'progress', done: i + 1, total: files.length })
    }
    zip.end()
    if (failed) throw failed
    post({ type: 'done', blob: new Blob(chunks, { type: 'application/zip' }) })
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
