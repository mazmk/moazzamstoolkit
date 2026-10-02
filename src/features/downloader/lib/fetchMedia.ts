export type ProgressCallback = (loadedBytes: number) => void

/** Fetches a URL into a Blob, reporting bytes as they arrive. */
export async function fetchBlob(
  url: string,
  {
    signal,
    onBytes,
    onTotal,
  }: { signal?: AbortSignal; onBytes?: ProgressCallback; onTotal?: ProgressCallback } = {},
): Promise<Blob> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`)
  const length = Number(res.headers.get('content-length'))
  if (length > 0) onTotal?.(length)
  if (!res.body || !onBytes) return res.blob()

  const reader = res.body.getReader()
  const chunks: Uint8Array<ArrayBuffer>[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    onBytes(value.byteLength)
  }
  return new Blob(chunks, { type: res.headers.get('content-type') ?? '' })
}

/** Fetches many URLs with bounded concurrency, returning results in input order. */
export async function fetchAllInOrder(
  urls: string[],
  {
    signal,
    onBytes,
    concurrency = 4,
  }: { signal?: AbortSignal; onBytes?: ProgressCallback; concurrency?: number },
): Promise<Blob[]> {
  const results: Blob[] = new Array<Blob>(urls.length)
  let next = 0

  const worker = async () => {
    while (next < urls.length) {
      const i = next++
      const url = urls[i]
      if (url) results[i] = await fetchBlob(url, { signal, onBytes })
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))
  return results
}
