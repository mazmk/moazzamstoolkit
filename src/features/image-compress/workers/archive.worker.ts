import { plainBytes } from '../lib/bytes'
import { planArchive, type ArchiveEntryInfo, type ArchiveErrorKind } from '../lib/archive'
import type { ArchiveRequest, ArchiveResponse, ExtractedEntry } from '../lib/protocol'
import { ZipFormatError, listZipEntries, readZipEntry } from '../lib/zipReader'

/**
 * Unpacks one archive per worker. Entry sizes are checked against the limits before anything is
 * inflated (zip-bomb protection); images are posted back in small batches with their buffers
 * transferred, so progress shows and memory is handed over as it goes.
 */

const BATCH_BYTES = 16 * 1024 * 1024
const BATCH_COUNT = 25

const post = (message: ArchiveResponse, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer })

class ArchiveFailure extends Error {
  readonly kind: ArchiveErrorKind
  constructor(kind: ArchiveErrorKind) {
    super(kind)
    this.kind = kind
  }
}

function createBatcher() {
  let batch: ExtractedEntry[] = []
  let bytes = 0
  let done = 0
  const flush = () => {
    if (batch.length === 0) return
    done += batch.length
    post(
      { type: 'entries', entries: batch, done },
      batch.map((e) => e.data.buffer),
    )
    batch = []
    bytes = 0
  }
  return {
    push(entry: ExtractedEntry) {
      batch.push(entry)
      bytes += entry.data.length
      if (bytes >= BATCH_BYTES || batch.length >= BATCH_COUNT) flush()
    },
    finish: flush,
  }
}

function plan(entries: Iterable<ArchiveEntryInfo>) {
  const result = planArchive(entries)
  if (!result.ok) throw new ArchiveFailure(result.error)
  post({
    type: 'planned',
    total: result.images.length,
    ignored: result.ignored,
    totalBytes: result.totalBytes,
  })
  return result
}

async function extractZip(data: Uint8Array) {
  const entries = listZipEntries(data)
  const byPath = new Map(entries.map((e) => [e.path, e]))
  const { images } = plan(entries)
  const batcher = createBatcher()
  for (const image of images) {
    const entry = byPath.get(image.path)!
    batcher.push({ path: entry.path, data: plainBytes(readZipEntry(data, entry)) })
  }
  batcher.finish()
}

async function extractRar(buffer: ArrayBuffer, wasmUrl: string) {
  const [{ createExtractorFromData }, wasmBinary] = await Promise.all([
    import('node-unrar-js'),
    fetch(wasmUrl).then((r) => {
      if (!r.ok) throw new Error(`unrar.wasm: HTTP ${r.status}`)
      return r.arrayBuffer()
    }),
  ])
  const extractor = await createExtractorFromData({ wasmBinary, data: buffer })
  const list = extractor.getFileList()
  if (list.arcHeader.flags.headerEncrypted) throw new ArchiveFailure('encrypted')

  function* infos(): Generator<ArchiveEntryInfo> {
    for (const header of list.fileHeaders) {
      yield {
        path: header.name,
        size: header.unpSize,
        directory: header.flags.directory,
        encrypted: header.flags.encrypted,
      }
    }
  }
  const { images } = plan(infos())
  const wanted = new Set(images.map((i) => i.path))
  const batcher = createBatcher()
  const { files } = extractor.extract({ files: (header) => wanted.has(header.name) })
  for (const file of files) {
    if (file.extraction)
      batcher.push({ path: file.fileHeader.name, data: plainBytes(file.extraction) })
  }
  batcher.finish()
}

function classify(err: unknown): ArchiveErrorKind {
  if (err instanceof ArchiveFailure) return err.kind
  if (err instanceof ZipFormatError) return err.kind
  if (err instanceof RangeError) return 'memory'
  // node-unrar-js throws UnrarError with a `reason`.
  const reason = err instanceof Error && 'reason' in err ? String(err.reason) : ''
  if (reason === 'ERAR_MISSING_PASSWORD' || reason === 'ERAR_BAD_PASSWORD') return 'encrypted'
  if (reason === 'ERAR_NO_MEMORY') return 'memory'
  return 'corrupt'
}

self.onmessage = async (event: MessageEvent<ArchiveRequest>) => {
  const { file, kind, unrarWasmUrl } = event.data
  try {
    const buffer = await file.arrayBuffer()
    if (kind === 'zip') await extractZip(new Uint8Array(buffer))
    else await extractRar(buffer, unrarWasmUrl ?? '')
    post({ type: 'finished' })
  } catch (err) {
    post({ type: 'error', error: classify(err) })
  }
}
