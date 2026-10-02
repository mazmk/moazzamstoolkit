import { useCallback } from 'react'

/**
 * Returns a callback ref that points a media element at an object URL for `blob`, and revokes the
 * URL when the element unmounts or the blob changes. Using a ref cleanup (React 19) instead of
 * state + effect avoids an extra render and stays correct under StrictMode's double-mount.
 */
export function useObjectUrlRef<T extends HTMLMediaElement>(blob: Blob, fragment = '') {
  return useCallback(
    (el: T | null) => {
      if (!el) return
      const url = URL.createObjectURL(blob)
      el.src = url + fragment
      return () => {
        el.removeAttribute('src')
        URL.revokeObjectURL(url)
      }
    },
    [blob, fragment],
  )
}
