/** A file picked, dropped or pasted, with its folder path when it came from a folder. */
export interface IncomingFile {
  file: File
  /** Folder path relative to what was picked/dropped, e.g. "photos/2024"; "" for loose files. */
  dir: string
  fromFolder: boolean
}

const parentDir = (path: string) => {
  const trimmed = path.replace(/^\/+/, '')
  const slash = trimmed.lastIndexOf('/')
  return slash === -1 ? '' : trimmed.slice(0, slash)
}

/** From <input type="file">, including `webkitdirectory` pickers (which set webkitRelativePath). */
export function fromFileList(list: FileList | File[]): IncomingFile[] {
  return Array.from(list, (file) => {
    const dir = parentDir(file.webkitRelativePath || '')
    return { file, dir, fromFolder: Boolean(file.webkitRelativePath) }
  })
}

const readBatch = (reader: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))

const fileOf = (entry: FileSystemFileEntry) =>
  new Promise<File>((resolve, reject) => entry.file(resolve, reject))

async function walk(entry: FileSystemEntry, out: IncomingFile[], fromFolder: boolean) {
  if (entry.isFile) {
    try {
      const file = await fileOf(entry as FileSystemFileEntry)
      out.push({ file, dir: fromFolder ? parentDir(entry.fullPath) : '', fromFolder })
    } catch {
      // Unreadable (permissions, vanished): skip it rather than fail the whole drop.
    }
    return
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    // readEntries returns at most ~100 entries per call; keep reading until it's empty.
    for (let batch = await readBatch(reader); batch.length; batch = await readBatch(reader)) {
      for (const child of batch) await walk(child, out, true)
    }
  }
}

/**
 * Files from a drop, walking into dropped folders. The entries must be taken synchronously
 * inside the drop handler (the DataTransfer is cleared afterwards), so call this before any await.
 */
export function fromDataTransfer(data: DataTransfer): Promise<IncomingFile[]> {
  const entries = Array.from(data.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry?.() ?? null)
  if (entries.length === 0 || entries.some((e) => e === null)) {
    return Promise.resolve(fromFileList(data.files))
  }
  return (async () => {
    const out: IncomingFile[] = []
    for (const entry of entries) await walk(entry!, out, false)
    return out
  })()
}
