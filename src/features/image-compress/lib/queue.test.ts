import { describe, expect, it } from 'vitest'

import { createQueue, isAbortError, poolSize } from './queue'

function deferred<T = void>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

const tick = () => new Promise((r) => setTimeout(r, 0))

describe('createQueue', () => {
  it('never runs more than `concurrency` tasks at once, in FIFO order', async () => {
    const queue = createQueue(2)
    const started: number[] = []
    const gates = [0, 1, 2, 3].map(() => deferred())
    const results = gates.map((gate, i) =>
      queue.add(async () => {
        started.push(i)
        await gate.promise
        return i
      }),
    )
    await tick()
    expect(started).toEqual([0, 1])
    expect(queue.running).toBe(2)
    expect(queue.pending).toBe(2)

    gates[1]!.resolve()
    await tick()
    expect(started).toEqual([0, 1, 2])

    gates.forEach((g) => g.resolve())
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3])
    expect(queue.running).toBe(0)
  })

  it('drops queued tasks whose signal aborts, without running them', async () => {
    const queue = createQueue(1)
    const gate = deferred()
    const ran: string[] = []
    const first = queue.add(async () => {
      ran.push('first')
      await gate.promise
    })
    const controller = new AbortController()
    const second = queue.add(async () => {
      ran.push('second')
    }, controller.signal)
    const third = queue.add(async () => {
      ran.push('third')
    })

    controller.abort()
    await expect(second).rejects.toSatisfy(isAbortError)
    gate.resolve()
    await first
    await third
    expect(ran).toEqual(['first', 'third'])
  })

  it('passes the signal to running tasks and rejects already-aborted ones', async () => {
    const queue = createQueue(1)
    const controller = new AbortController()
    const seen = queue.add(
      (signal) =>
        new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(new Error('stopped'))),
        ),
      controller.signal,
    )
    await tick()
    controller.abort()
    await expect(seen).rejects.toThrow('stopped')
    await expect(queue.add(async () => 1, controller.signal)).rejects.toSatisfy(isAbortError)
  })

  it('keeps going after a task fails', async () => {
    const queue = createQueue(1)
    const failed = queue.add(async () => {
      throw new Error('boom')
    })
    await expect(failed).rejects.toThrow('boom')
    expect(await queue.add(async () => 'ok')).toBe('ok')
  })
})

describe('poolSize', () => {
  it('leaves a core free, caps at 4 and never drops below 1', () => {
    expect(poolSize(16)).toBe(4)
    expect(poolSize(4)).toBe(3)
    expect(poolSize(2)).toBe(1)
    expect(poolSize(1)).toBe(1)
    expect(poolSize(undefined)).toBe(1)
  })
})
