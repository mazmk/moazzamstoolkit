import { useEffect, useRef } from 'react'

import { fromFileList, type IncomingFile } from '../lib/fileInput'

/**
 * Ctrl/Cmd+V anywhere on the page adds pasted images (screenshots, copied files). Text pastes into
 * fields are left alone.
 */
export function usePasteFiles(onFiles: (files: IncomingFile[]) => void) {
  const handlerRef = useRef(onFiles)
  useEffect(() => {
    handlerRef.current = onFiles
  })

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.length === 0) return
      event.preventDefault()
      handlerRef.current(fromFileList(files))
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])
}
