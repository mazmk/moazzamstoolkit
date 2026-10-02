import type { SavedRecording } from '../store'

export function downloadRecording(r: SavedRecording) {
  const url = URL.createObjectURL(r.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${r.name.replace(/[^\w\- ]+/g, '-')}.webm`
  a.click()
  URL.revokeObjectURL(url)
}
