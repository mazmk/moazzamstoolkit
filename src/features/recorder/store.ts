import {
  createStore as createIdbStore,
  del as idbDel,
  get as idbGet,
  keys as idbKeys,
  set as idbSet,
} from 'idb-keyval'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { OverlaySettings } from './lib/overlay'

export type RecordingMode = 'screen' | 'camera'

export interface SavedRecording {
  id: string
  name: string
  blob: Blob
  duration: number // ms
  createdAt: number // unix ms
  size: number // bytes
}

const idb = createIdbStore('screennest', 'recordings')

interface RecorderStore {
  recordings: SavedRecording[]
  loadRecordings: () => Promise<void>
  saveRecording: (r: SavedRecording) => Promise<void>
  deleteRecording: (id: string) => Promise<void>
}

export const useRecorderStore = create<RecorderStore>((set) => ({
  recordings: [],

  loadRecordings: async () => {
    const ids = await idbKeys<string>(idb)
    const rows = await Promise.all(ids.map((id) => idbGet<SavedRecording>(id, idb)))
    const sorted = (rows.filter(Boolean) as SavedRecording[]).sort(
      (a, b) => b.createdAt - a.createdAt,
    )
    set({ recordings: sorted })
  },

  saveRecording: async (r) => {
    await idbSet(r.id, r, idb)
    set((state) => ({ recordings: [r, ...state.recordings] }))
  },

  deleteRecording: async (id) => {
    await idbDel(id, idb)
    set((state) => ({ recordings: state.recordings.filter((r) => r.id !== id) }))
  },
}))

interface RecorderSettings {
  mode: RecordingMode
  micEnabled: boolean
  overlay: OverlaySettings
  setMode: (mode: RecordingMode) => void
  setMicEnabled: (enabled: boolean) => void
  setOverlay: (patch: Partial<OverlaySettings>) => void
}

export const useRecorderSettings = create<RecorderSettings>()(
  persist(
    (set) => ({
      mode: 'screen',
      micEnabled: true,
      overlay: { visible: true, x: 1, y: 1, size: 'md' },
      setMode: (mode) => set({ mode }),
      setMicEnabled: (micEnabled) => set({ micEnabled }),
      setOverlay: (patch) => set((state) => ({ overlay: { ...state.overlay, ...patch } })),
    }),
    {
      name: 'screennest:recorder-settings',
      partialize: ({ mode, micEnabled, overlay }) => ({ mode, micEnabled, overlay }),
    },
  ),
)
