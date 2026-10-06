import type { CompressOutcome, CompressRequest, CompressResponse } from './protocol'
import { AbortError, createQueue, poolSize, type Queue } from './queue'

interface Slot {
  worker: Worker
  busy: boolean
}

export interface RunHandlers {
  onStart?: () => void
  onProgress?: (value: number) => void
}

const createWorker = () =>
  new Worker(new URL('../workers/compress.worker.ts', import.meta.url), {
    type: 'module',
    name: 'image-compress',
  })

/**
 * A pool of compress workers behind a FIFO queue. Workers are created on the first job (so codecs
 * load only once there's an image to process). Aborting a running job terminates its worker —
 * WASM encoders can't be interrupted otherwise — and a fresh one is created for the next job.
 */
export class CompressPool {
  private slots: Slot[] = []
  private readonly queue: Queue
  private nextJobId = 1

  constructor(size = poolSize(globalThis.navigator?.hardwareConcurrency)) {
    this.queue = createQueue(size)
  }

  run(
    request: Omit<CompressRequest, 'jobId'>,
    signal: AbortSignal,
    handlers: RunHandlers = {},
  ): Promise<CompressOutcome> {
    return this.queue.add((taskSignal) => this.exec(request, taskSignal, handlers), signal)
  }

  get active() {
    return this.queue.running + this.queue.pending
  }

  private acquire(): Slot {
    const idle = this.slots.find((s) => !s.busy)
    if (idle) return idle
    const slot = { worker: createWorker(), busy: false }
    this.slots.push(slot)
    return slot
  }

  private discard(slot: Slot) {
    slot.worker.terminate()
    this.slots = this.slots.filter((s) => s !== slot)
  }

  private exec(
    request: Omit<CompressRequest, 'jobId'>,
    signal: AbortSignal,
    { onStart, onProgress }: RunHandlers,
  ): Promise<CompressOutcome> {
    const slot = this.acquire()
    slot.busy = true
    const jobId = this.nextJobId++
    onStart?.()

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        slot.worker.removeEventListener('message', onMessage)
        slot.worker.removeEventListener('error', onError)
        signal.removeEventListener('abort', onAbort)
      }
      const onMessage = (event: MessageEvent<CompressResponse>) => {
        const message = event.data
        if (message.jobId !== jobId) return
        if (message.type === 'progress') {
          onProgress?.(message.value)
          return
        }
        cleanup()
        slot.busy = false
        if (message.type === 'done') resolve(message.outcome)
        else reject(new Error(message.message))
      }
      const onError = (event: ErrorEvent) => {
        cleanup()
        this.discard(slot)
        reject(new Error(event.message || 'The image worker crashed (possibly out of memory).'))
      }
      const onAbort = () => {
        cleanup()
        this.discard(slot)
        reject(new AbortError())
      }
      slot.worker.addEventListener('message', onMessage)
      slot.worker.addEventListener('error', onError)
      signal.addEventListener('abort', onAbort, { once: true })
      slot.worker.postMessage({ ...request, jobId } satisfies CompressRequest)
    })
  }

  /** Stops every worker. Callers abort their jobs first so pending promises settle. */
  dispose() {
    for (const slot of this.slots) slot.worker.terminate()
    this.slots = []
  }
}
