import { buildOutputName, joinPath, uniquePaths, type FilenameSettings } from './filename'
import { OUTPUT_EXTENSION, type OutputFormat } from './formats'

interface OutputItem {
  id: string
  name: string
  dir: string
  source: { kind: string; archive?: string }
  result: { format: OutputFormat } | null
}

/**
 * The download path of every finished image: renamed per the filename settings, inside its
 * original folder when `keepFolders` is on, and unique across the whole batch so nothing is
 * overwritten. One map serves single downloads, the ZIP and folder saves, so names always agree.
 */
export function assignOutputPaths(
  items: OutputItem[],
  filename: FilenameSettings,
  keepFolders: boolean,
): Map<string, string> {
  const done = items.filter((i) => i.result)
  const paths = done.map((item, index) => {
    const name = buildOutputName(
      item.name,
      OUTPUT_EXTENSION[item.result!.format],
      filename,
      index,
      done.length,
    )
    return keepFolders && item.source.kind !== 'file' ? joinPath(item.dir, name) : name
  })
  const unique = uniquePaths(paths)
  return new Map(done.map((item, i) => [item.id, unique[i]!]))
}
