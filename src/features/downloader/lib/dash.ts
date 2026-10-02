export interface DashRepresentation {
  id: string
  kind: 'video' | 'audio'
  codecs: string
  bandwidth: number
  width: number | null
  height: number | null
  initUrl: string
  segmentUrls: string[]
}

// SegmentTemplate URLs can include $RepresentationID$, $Bandwidth$, $Number$ and $Time$ (optionally %0Nd-padded).
function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\$(\w+)(?:%0(\d+)d)?\$/g, (match, name: string, pad?: string) => {
    const value = vars[name]
    if (value === undefined) return match
    return pad ? String(value).padStart(Number(pad), '0') : String(value)
  })
}

// Relative segment URLs inherit the manifest's query string — CDN-signed manifests (like Loom's)
// sign a whole directory, and `new URL(relative, base)` would otherwise drop the signature.
function resolveUrl(path: string, base: URL): string {
  const url = new URL(path, base)
  if (!url.search && base.search) url.search = base.search
  return url.toString()
}

function baseUrlFor(el: Element, manifestUrl: URL): URL {
  const chain: string[] = []
  for (let node: Element | null = el; node; node = node.parentElement) {
    const base = Array.from(node.children).find((c) => c.localName === 'BaseURL')
    if (base?.textContent) chain.unshift(base.textContent.trim())
  }
  return chain.reduce((acc, part) => {
    const next = new URL(part, acc)
    if (!next.search) next.search = manifestUrl.search
    return next
  }, manifestUrl)
}

function segmentTimes(template: Element): number[] {
  const timeline = Array.from(template.children).find((c) => c.localName === 'SegmentTimeline')
  if (!timeline) return []
  const times: number[] = []
  let t = 0
  for (const s of Array.from(timeline.children).filter((c) => c.localName === 'S')) {
    if (s.hasAttribute('t')) t = Number(s.getAttribute('t'))
    const d = Number(s.getAttribute('d'))
    // r = -1 ("repeat until the next S / end of period") isn't used by static VOD manifests.
    const repeat = Math.max(0, Number(s.getAttribute('r') ?? 0))
    for (let i = 0; i <= repeat; i++) {
      times.push(t)
      t += d
    }
  }
  return times
}

const childNamed = (el: Element | null, name: string) =>
  el ? (Array.from(el.children).find((c) => c.localName === name) ?? null) : null

/** Parses a static DASH manifest that uses SegmentTemplate + SegmentTimeline (what Loom serves). */
export function parseDashManifest(xml: string, manifestUrl: string): DashRepresentation[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid DASH manifest')
  const base = new URL(manifestUrl)
  const representations: DashRepresentation[] = []

  for (const set of Array.from(doc.getElementsByTagName('AdaptationSet'))) {
    for (const rep of Array.from(set.getElementsByTagName('Representation'))) {
      const mime = rep.getAttribute('mimeType') ?? set.getAttribute('mimeType') ?? ''
      const contentType = set.getAttribute('contentType') ?? mime.split('/')[0]
      if (contentType !== 'video' && contentType !== 'audio') continue

      const template = childNamed(rep, 'SegmentTemplate') ?? childNamed(set, 'SegmentTemplate')
      const init = template?.getAttribute('initialization')
      const media = template?.getAttribute('media')
      if (!template || !init || !media) continue

      const id = rep.getAttribute('id') ?? ''
      const bandwidth = Number(rep.getAttribute('bandwidth') ?? 0)
      const startNumber = Number(template.getAttribute('startNumber') ?? 1)
      const repBase = baseUrlFor(rep, base)
      const vars = { RepresentationID: id, Bandwidth: bandwidth }

      const segmentUrls = segmentTimes(template).map((time, i) =>
        resolveUrl(fillTemplate(media, { ...vars, Number: startNumber + i, Time: time }), repBase),
      )
      if (segmentUrls.length === 0) continue

      const width = rep.getAttribute('width')
      const height = rep.getAttribute('height')
      representations.push({
        id,
        kind: contentType,
        codecs: rep.getAttribute('codecs') ?? set.getAttribute('codecs') ?? '',
        bandwidth,
        width: width ? Number(width) : null,
        height: height ? Number(height) : null,
        initUrl: resolveUrl(fillTemplate(init, vars), repBase),
        segmentUrls,
      })
    }
  }
  return representations
}
