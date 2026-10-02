export type Provider = 'loom' | 'jam'

export interface ParsedVideoUrl {
  provider: Provider
  id: string
}

export const PROVIDER_NAMES: Record<Provider, string> = { loom: 'Loom', jam: 'Jam' }

// loom.com/share/<id>, /embed/<id>, /v/<id> — share links may prefix the id with a title slug.
const LOOM_PATH = /^\/(?:share|embed|v)\/(?:.*-)?([0-9a-f]{32})\/?$/i
const JAM_PATH = /^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i

const matchesHost = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`)

export function parseVideoUrl(input: string): ParsedVideoUrl | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.toLowerCase()
  if (matchesHost(host, 'loom.com')) {
    const id = LOOM_PATH.exec(url.pathname)?.[1]
    return id ? { provider: 'loom', id: id.toLowerCase() } : null
  }
  if (matchesHost(host, 'jam.dev')) {
    const id = JAM_PATH.exec(url.pathname)?.[1]
    return id ? { provider: 'jam', id: id.toLowerCase() } : null
  }
  return null
}
