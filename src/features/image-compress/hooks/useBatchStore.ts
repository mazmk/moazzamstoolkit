import { create } from 'zustand'

import { targetBytes } from '../lib/bytes'
import type { InputFormat } from '../lib/formats'
import type { SortDirection, SortKey, StatusFilter } from '../lib/list'
import {
  AUTO_APPLY_LIMIT,
  DEFAULT_SETTINGS,
  clampQuality,
  encodeKey,
  parseSettings,
  type EncodeSettings,
  type Settings,
} from '../lib/settings'
import type { ImageItem, ItemSource } from '../lib/types'

const STORAGE_KEY = 'toolkit:image-compress:settings'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseSettings(JSON.parse(raw)) : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Private mode or blocked storage: settings just won't persist.
  }
}

export interface NewItem {
  file: Blob
  name: string
  dir: string
  source: ItemSource
  format: InputFormat
}

/** A batch item plus the settings it should be (or was) compressed with. */
export interface BatchItem extends ImageItem {
  /** Snapshot of the batch settings this image follows; replaced when settings are applied to it. */
  applied: Settings
  /** encodeKey of the last finished attempt (success or failure), so failures aren't retried in a loop. */
  attemptKey: string | null
}

export interface ArchiveProgress {
  id: string
  name: string
  done: number
  total: number | null
}

interface BatchState {
  items: BatchItem[]
  selected: ReadonlySet<string>
  settings: Settings
  /** Apply settings changes to every image automatically (forced off above AUTO_APPLY_LIMIT). */
  autoApply: boolean
  /** Set by Cancel; nothing new starts until the user resumes, adds images or changes settings. */
  paused: boolean
  archives: ArchiveProgress[]
  sort: SortKey
  sortDirection: SortDirection
  filter: StatusFilter
  compareId: string | null
}

interface BatchActions {
  addItems: (items: NewItem[]) => void
  updateItem: (id: string, patch: Partial<BatchItem>) => void
  updateItems: (ids: ReadonlySet<string>, patch: Partial<BatchItem>) => void
  removeItems: (ids: Iterable<string>) => void
  clear: () => void
  setSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
  setAutoApply: (on: boolean) => void
  applySettings: (ids?: Iterable<string>) => void
  setQualityOverride: (id: string, quality: number | null) => void
  retryFailed: () => void
  setPaused: (paused: boolean) => void
  select: (ids: Iterable<string>, mode: 'set' | 'add' | 'remove' | 'toggle') => void
  setView: (patch: Partial<Pick<BatchState, 'sort' | 'sortDirection' | 'filter'>>) => void
  setArchive: (progress: ArchiveProgress | { id: string; remove: true }) => void
  setCompare: (id: string | null) => void
}

let nextId = 1

const revoke = (items: Iterable<BatchItem>) => {
  for (const item of items) if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl)
}

/** The settings that decide an item's output: its applied batch settings plus its own override. */
export function encodeSettingsFor(
  item: Pick<BatchItem, 'applied' | 'qualityOverride'>,
): EncodeSettings {
  const s = item.applied
  return {
    quality: item.qualityOverride ?? s.quality,
    format: s.format,
    background: s.background,
    resize: s.resize,
    stripMetadata: s.stripMetadata,
    targetBytes: s.target.enabled ? targetBytes(s.target.value, s.target.unit) : null,
  }
}

export const desiredKey = (item: Pick<BatchItem, 'applied' | 'qualityOverride'>) =>
  encodeKey(encodeSettingsFor(item))

/** True when the item's result was made with settings other than the ones it now follows. */
export const isOutdated = (item: BatchItem) =>
  item.result !== null && item.result.key !== desiredKey(item)

/** Encode-relevant settings differ between the panel and what an item follows. */
export const settingsDiffer = (a: Settings, b: Settings) =>
  encodeKey(encodeSettingsFor({ applied: a, qualityOverride: null })) !==
  encodeKey(encodeSettingsFor({ applied: b, qualityOverride: null }))

const initialState = (): Omit<BatchState, 'settings'> => ({
  items: [],
  selected: new Set(),
  autoApply: true,
  paused: false,
  archives: [],
  sort: 'added',
  sortDirection: 'asc',
  filter: 'all',
  compareId: null,
})

export const useBatchStore = create<BatchState & BatchActions>((set, get) => ({
  ...initialState(),
  settings: loadSettings(),

  addItems: (incoming) =>
    set((state) => {
      const items = [
        ...state.items,
        ...incoming.map((n): BatchItem => ({
          ...n,
          id: `img-${nextId++}`,
          size: n.file.size,
          qualityOverride: null,
          status: 'queued',
          progress: 0,
          message: null,
          sourceSize: null,
          thumbUrl: null,
          result: null,
          applied: state.settings,
          attemptKey: null,
        })),
      ]
      // Above the limit, re-running everything on every slider move would be too slow.
      const autoApply = items.length > AUTO_APPLY_LIMIT ? false : state.autoApply
      return { items, autoApply, paused: false }
    }),

  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),

  updateItems: (ids, patch) =>
    set((state) => ({
      items: state.items.map((item) => (ids.has(item.id) ? { ...item, ...patch } : item)),
    })),

  removeItems: (ids) =>
    set((state) => {
      const remove = new Set(ids)
      revoke(state.items.filter((i) => remove.has(i.id)))
      const selected = new Set([...state.selected].filter((id) => !remove.has(id)))
      return {
        items: state.items.filter((i) => !remove.has(i.id)),
        selected,
        compareId: state.compareId && remove.has(state.compareId) ? null : state.compareId,
      }
    }),

  clear: () => {
    revoke(get().items)
    set({ ...initialState(), settings: get().settings })
  },

  setSettings: (patch) =>
    set((state) => {
      const settings = { ...state.settings, ...patch }
      saveSettings(settings)
      if (!state.autoApply) return { settings }
      return {
        settings,
        paused: false,
        items: state.items.map((item) => ({ ...item, applied: settings })),
      }
    }),

  resetSettings: () => get().setSettings(DEFAULT_SETTINGS),

  setAutoApply: (on) => {
    const state = get()
    if (on && state.items.length > AUTO_APPLY_LIMIT) return
    set({ autoApply: on })
    if (on) state.applySettings()
  },

  applySettings: (ids) =>
    set((state) => {
      const only = ids ? new Set(ids) : null
      return {
        paused: false,
        items: state.items.map((item) =>
          !only || only.has(item.id) ? { ...item, applied: state.settings } : item,
        ),
      }
    }),

  setQualityOverride: (id, quality) =>
    set((state) => ({
      paused: false,
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, qualityOverride: quality === null ? null : clampQuality(quality) }
          : item,
      ),
    })),

  retryFailed: () =>
    set((state) => ({
      paused: false,
      items: state.items.map((item) =>
        item.status === 'failed'
          ? { ...item, attemptKey: null, status: 'queued', message: null }
          : item,
      ),
    })),

  setPaused: (paused) => set({ paused }),

  select: (ids, mode) =>
    set((state) => {
      const list = [...ids]
      if (mode === 'set') return { selected: new Set(list) }
      const next = new Set(state.selected)
      for (const id of list) {
        if (mode === 'add' || (mode === 'toggle' && !next.has(id))) next.add(id)
        else next.delete(id)
      }
      return { selected: next }
    }),

  setView: (patch) => set(patch),

  setArchive: (progress) =>
    set((state) => {
      if ('remove' in progress)
        return { archives: state.archives.filter((a) => a.id !== progress.id) }
      const exists = state.archives.some((a) => a.id === progress.id)
      return {
        archives: exists
          ? state.archives.map((a) => (a.id === progress.id ? progress : a))
          : [...state.archives, progress],
      }
    }),

  setCompare: (compareId) => set({ compareId }),
}))
