/** Lowercase, ASCII-ish, dash-separated. "Hello, World! (v2)" → "hello-world-v2". */
export function slugify(text: string, maxLength = 80): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '')
}

/** Removes inline markdown (emphasis, code, links, images) to get plain heading text. */
function plainText(inline: string): string {
  return inline
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]+/g, '')
    .replace(/\s+#+\s*$/, '') // closing hashes: "# Title #"
    .trim()
}

/**
 * The first level-1 heading (ATX `# Title` or setext `Title\n===`), ignoring fenced code blocks.
 * Returns null when there isn't one.
 */
export function firstHeading(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/)
  let fence: string | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? ''
      if (fence === null) fence = marker[0] ?? null
      else if (marker[0] === fence) fence = null
      continue
    }
    if (fence) continue

    const atx = /^\s{0,3}#\s+(.+)$/.exec(line)
    if (atx?.[1]) return plainText(atx[1]) || null

    const next = lines[i + 1] ?? ''
    if (line.trim() && /^\s{0,3}=+\s*$/.test(next)) return plainText(line) || null
  }
  return null
}

/** Base name for exported files: the slugified first H1, or "document". */
export function exportBaseName(markdown: string): string {
  const heading = firstHeading(markdown)
  return (heading && slugify(heading)) || 'document'
}

export interface DocumentStats {
  words: number
  characters: number
  readingMinutes: number
}

const WORDS_PER_MINUTE = 220

export function documentStats(markdown: string): DocumentStats {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' ') // code isn't "read" like prose
    .match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)
  const count = words?.length ?? 0
  return {
    words: count,
    characters: markdown.length,
    readingMinutes: count === 0 ? 0 : Math.max(1, Math.round(count / WORDS_PER_MINUTE)),
  }
}
