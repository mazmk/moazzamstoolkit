export class AbortError extends Error {
  constructor() {
    super('Aborted')
    this.name = 'AbortError'
  }
}

export const isAbortError = (err: unknown) => err instanceof Error && err.name === 'AbortError'

export interface Queue {
  /**
   * Runs `task` when a slot is free. Aborting `signal` drops a queued task (its promise rejects
   * with AbortError) or is passed to a running one, which must stop on its own.
   */
  add<T>(task: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T>
  readonly running: number
  readonly pending: number
}

interface Waiting {
  start: () => void
  signal?: AbortSignal
  onAbort: () => void
}

/** A FIFO concurrency limiter with per-task cancellation. */
export function createQueue(concurrency: number): Queue {
  const limit = Math.max(1, Math.floor(concurrency))
  const waiting: Waiting[] = []
  let running = 0

  const next = () => {
    while (running < limit && waiting.length > 0) {
      const item = waiting.shift()!
      item.signal?.removeEventListener('abort', item.onAbort)
      item.start()
    }
  }

  return {
    add<T>(task: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal) {
      return new Promise<T>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new AbortError())
          return
        }
        const item: Waiting = {
          signal,
          start: () => {
            running++
            const ownSignal = signal ?? new AbortController().signal
            Promise.resolve()
              .then(() => task(ownSignal))
              .then(resolve, reject)
              .finally(() => {
                running--
                next()
              })
          },
          onAbort: () => {
            const index = waiting.indexOf(item)
            if (index !== -1) waiting.splice(index, 1)
            reject(new AbortError())
          },
        }
        signal?.addEventListener('abort', item.onAbort, { once: true })
        waiting.push(item)
        next()
      })
    },
    get running() {
      return running
    },
    get pending() {
      return waiting.length
    },
  }
}

/** Workers to run: one core is left for the page, at most 4, at least 1. */
export function poolSize(hardwareConcurrency: number | undefined): number {
  const cores = Number.isFinite(hardwareConcurrency) ? (hardwareConcurrency as number) : 2
  return Math.max(1, Math.min(4, cores - 1))
}
