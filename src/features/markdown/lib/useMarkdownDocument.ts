import { useCallback, useEffect, useRef, useState } from 'react'

import { SAMPLE_MARKDOWN } from './sample'

export const STORAGE_KEY = 'toolkit:markdown:document'
const SAVE_DELAY_MS = 400

function readSaved(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? SAMPLE_MARKDOWN
  } catch {
    return SAMPLE_MARKDOWN // storage blocked (private mode, disabled site data)
  }
}

/**
 * The editor's text, autosaved to localStorage (debounced). First visit gets the sample document.
 * `savedAt` is the time of the last successful save, or null if storage isn't available.
 */
export function useMarkdownDocument() {
  const [text, setText] = useState(readSaved)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const latestTextRef = useRef(text)

  useEffect(() => {
    latestTextRef.current = text
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, text)
        setSavedAt(Date.now())
      } catch {
        setSavedAt(null)
      }
    }, SAVE_DELAY_MS)
    return () => clearTimeout(id)
  }, [text])

  // Flush a pending save if the tab is closed mid-debounce.
  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(STORAGE_KEY, latestTextRef.current)
      } catch {
        // nothing else we can do
      }
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  const reset = useCallback(() => setText(SAMPLE_MARKDOWN), [])

  return { text, setText, reset, savedAt }
}
