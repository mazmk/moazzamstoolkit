import { useCallback, useEffect, useRef } from 'react'

import { CompressPool } from '../lib/pool'
import type { CompressOutcome } from '../lib/protocol'
import { isAbortError } from '../lib/queue'
import { AUTO_APPLY_DELAY_MS } from '../lib/settings'
import { desiredKey, encodeSettingsFor, useBatchStore, type BatchItem } from './useBatchStore'

interface Job {
  key: string
  controller: AbortController
}

type Trigger = 'now' | 'debounce' | null

/**
 * What a store change means for scheduling: new images, removals, retries and resumes start work
 * now; settings and per-image quality changes wait AUTO_APPLY_DELAY_MS so dragging a slider
 * doesn't start (and cancel) a job per pixel.
 */
function triggerFor(
  state: ReturnType<typeof useBatchStore.getState>,
  prev: ReturnType<typeof useBatchStore.getState>,
): Trigger {
  if (prev.paused && !state.paused) return 'now'
  if (state.items === prev.items) return null
  if (state.items.length !== prev.items.length) return 'now'
  let trigger: Trigger = null
  for (let i = 0; i < state.items.length; i++) {
    const a = state.items[i]!
    const b = prev.items[i]!
    if (a === b) continue
    if (a.id !== b.id || (a.attemptKey === null && b.attemptKey !== null)) return 'now'
    if (a.applied !== b.applied || a.qualityOverride !== b.qualityOverride) trigger = 'debounce'
  }
  return trigger
}

function outcomePatch(item: BatchItem, key: string, outcome: CompressOutcome): Partial<BatchItem> {
  const thumbUrl = item.thumbUrl ?? (outcome.thumb ? URL.createObjectURL(outcome.thumb) : null)
  if (outcome.kind === 'skipped') {
    return {
      status: 'skipped',
      message: outcome.reason,
      format: outcome.inputFormat ?? item.format,
      sourceSize: outcome.sourceSize,
      thumbUrl,
      attemptKey: key,
      progress: 0,
    }
  }
  const status = !outcome.targetReached
    ? 'target-missed'
    : outcome.keptOriginal
      ? 'optimized'
      : 'done'
  return {
    status,
    message: outcome.usedFallback
      ? 'Compressed with the browser’s built-in encoder because the codec failed to load.'
      : null,
    format: outcome.inputFormat,
    sourceSize: outcome.sourceSize,
    thumbUrl,
    attemptKey: key,
    progress: 1,
    result: {
      status,
      blob: outcome.blob,
      key,
      format: outcome.format,
      size: outcome.size,
      quality: outcome.quality,
      keptOriginal: outcome.keptOriginal,
      targetReached: outcome.targetReached,
    },
  }
}

/**
 * Keeps every image's output in step with the settings it follows. Each image has a desired key;
 * a job runs whenever the last attempt was made with another key. Running jobs whose key went
 * stale are cancelled (their worker is terminated). Mount once, on the page.
 */
export function useCompressionRunner() {
  const poolRef = useRef<CompressPool | null>(null)
  const jobsRef = useRef(new Map<string, Job>())

  const schedule = useCallback(() => {
    const state = useBatchStore.getState()
    const { updateItem } = state
    const jobs = jobsRef.current
    const live = new Set(state.items.map((i) => i.id))
    for (const [id, job] of jobs) {
      if (!live.has(id)) {
        job.controller.abort()
        jobs.delete(id)
      }
    }
    if (state.paused) return

    const started = new Set<string>()
    for (const item of state.items) {
      if (item.status === 'skipped') continue
      const key = desiredKey(item)
      const running = jobs.get(item.id)
      if (running) {
        if (running.key === key) continue
        running.controller.abort()
        jobs.delete(item.id)
      } else if (item.attemptKey === key) {
        continue
      }

      const controller = new AbortController()
      const job = { key, controller }
      jobs.set(item.id, job)
      const current = () => jobs.get(item.id) === job
      started.add(item.id)

      poolRef.current ??= new CompressPool()
      poolRef.current
        .run(
          {
            file: item.file,
            name: item.name,
            format: item.format,
            settings: encodeSettingsFor(item),
            wantThumb: item.thumbUrl === null,
          },
          controller.signal,
          {
            onStart: () => current() && updateItem(item.id, { status: 'processing' }),
            onProgress: (progress) => current() && updateItem(item.id, { progress }),
          },
        )
        .then((outcome) => {
          if (!current()) return
          jobs.delete(item.id)
          const latest = useBatchStore.getState().items.find((i) => i.id === item.id)
          if (latest) updateItem(item.id, outcomePatch(latest, key, outcome))
        })
        .catch((err: unknown) => {
          if (!current()) return
          jobs.delete(item.id)
          if (isAbortError(err)) return
          updateItem(item.id, {
            status: 'failed',
            message: err instanceof Error ? err.message : 'Compression failed.',
            attemptKey: key,
            progress: 0,
          })
        })
    }
    // One store update for the whole batch, not one per image. Earlier results stay visible.
    if (started.size)
      useBatchStore.getState().updateItems(started, { status: 'queued', progress: 0 })
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const run = (delay: number) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        schedule()
      }, delay)
    }
    run(0)
    const unsubscribe = useBatchStore.subscribe((state, prev) => {
      const trigger = triggerFor(state, prev)
      if (trigger === 'now') run(0)
      else if (trigger === 'debounce') run(AUTO_APPLY_DELAY_MS)
    })
    const jobs = jobsRef.current
    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
      for (const job of jobs.values()) job.controller.abort()
      jobs.clear()
      poolRef.current?.dispose()
      poolRef.current = null
      // Revokes every thumbnail URL; settings stay in localStorage.
      useBatchStore.getState().clear()
    }
  }, [schedule])

  /** Stops everything in flight. Images keep any earlier result; the rest show "Cancelled". */
  const cancelAll = useCallback(() => {
    const store = useBatchStore.getState()
    store.setPaused(true)
    const jobs = jobsRef.current
    const ids = new Set(jobs.keys())
    for (const job of jobs.values()) job.controller.abort()
    jobs.clear()
    useBatchStore.setState((state) => ({
      items: state.items.map((item) =>
        ids.has(item.id) || item.status === 'queued' || item.status === 'processing'
          ? { ...item, status: item.result ? item.result.status : 'cancelled', progress: 0 }
          : item,
      ),
    }))
  }, [])

  return { cancelAll }
}
