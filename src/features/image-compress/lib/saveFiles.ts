/** Above this, the ZIP is built in memory slowly and may fail; suggest saving to a folder. */
export const LARGE_DOWNLOAD_BYTES = 1024 ** 3
/** fflate can't write ZIP64, so a ZIP must stay under 4 GB. */
export const MAX_ZIP_BYTES = 4 * 1024 ** 3 - 64 * 1024 ** 2

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  // The click starts the download synchronously; give the browser a moment before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

interface DirectoryPickerWindow {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite'
    id?: string
  }) => Promise<FileSystemDirectoryHandle>
}

export function canSaveToFolder(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export class SaveCancelled extends Error {}

/**
 * Writes files into a folder the user picks (File System Access API, Chromium only). Paths with
 * folders create subfolders. Existing files with the same name are overwritten — the browser's
 * permission prompt names the folder, and our paths are already unique within the batch.
 */
export async function saveToFolder(
  files: { path: string; blob: Blob }[],
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const picker = (window as Window & DirectoryPickerWindow).showDirectoryPicker
  if (!picker) throw new Error('Saving to a folder isn’t supported in this browser.')
  let root: FileSystemDirectoryHandle
  try {
    root = await picker({ mode: 'readwrite', id: 'image-compress' })
  } catch {
    throw new SaveCancelled()
  }
  const dirs = new Map<string, FileSystemDirectoryHandle>([['', root]])
  const dirFor = async (path: string) => {
    let current = ''
    let handle = root
    for (const segment of path.split('/').filter(Boolean)) {
      current = current ? `${current}/${segment}` : segment
      const cached = dirs.get(current)
      handle = cached ?? (await handle.getDirectoryHandle(segment, { create: true }))
      dirs.set(current, handle)
    }
    return handle
  }
  for (const [i, { path, blob }] of files.entries()) {
    const slash = path.lastIndexOf('/')
    const dir = await dirFor(slash === -1 ? '' : path.slice(0, slash))
    const fileHandle = await dir.getFileHandle(path.slice(slash + 1), { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    onProgress(i + 1, files.length)
  }
}
