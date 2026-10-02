import { describe, expect, it } from 'vitest'

import { SITE, TOOL_META } from '../src/app/toolMeta.ts'
import {
  escapeAttr,
  homePage,
  renderHead,
  renderManifest,
  renderRobots,
  renderSitemap,
  replaceHead,
  toolPage,
} from './seo.ts'

const SITE_URL = 'https://example.github.io/toolkit'
const BASE = '/toolkit/'

const metaContent = (html: string, attr: 'name' | 'property', key: string) =>
  new RegExp(`<meta ${attr}="${key.replace(/[:]/g, '\\:')}" content="([^"]*)"`).exec(html)?.[1]

describe('renderHead', () => {
  it('has everything link previews and search need on the home page', () => {
    const head = renderHead(homePage(), SITE_URL, BASE)
    expect(head).toContain(`<link rel="canonical" href="${SITE_URL}/" />`)
    expect(metaContent(head, 'property', 'og:image')).toBe(`${SITE_URL}/og/home.png`)
    expect(metaContent(head, 'property', 'og:image:width')).toBe('1200')
    expect(metaContent(head, 'property', 'og:image:height')).toBe('630')
    expect(metaContent(head, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(metaContent(head, 'property', 'og:site_name')).toBe(SITE.name)
    expect(metaContent(head, 'name', 'description')).toBe(SITE.description)
    expect(head).toContain(`href="${BASE}icons/apple-touch-icon.png"`)
    expect(head).toContain(`href="${BASE}manifest.webmanifest"`)
  })

  it('gives every tool its own title, description, URL and preview card', () => {
    for (const tool of TOOL_META) {
      const head = renderHead(toolPage(tool), SITE_URL, BASE)
      const url = `${SITE_URL}${tool.path}/`
      expect(head).toContain(`<link rel="canonical" href="${url}" />`)
      expect(metaContent(head, 'property', 'og:url')).toBe(url)
      expect(metaContent(head, 'property', 'og:image')).toBe(`${SITE_URL}/og/${tool.id}.png`)
      expect(metaContent(head, 'name', 'description')).toBe(escapeAttr(tool.seoDescription))
      expect(head).toContain(`<title>${escapeAttr(tool.seoTitle)} · ${SITE.name}</title>`)
    }
  })

  it('keeps descriptions within a link-preview friendly length', () => {
    for (const d of [SITE.description, ...TOOL_META.map((t) => t.seoDescription)]) {
      expect(d.length).toBeGreaterThan(70)
      expect(d.length).toBeLessThanOrEqual(200)
    }
  })

  it('emits valid JSON-LD that cannot break out of its script tag', () => {
    const head = renderHead(toolPage(TOOL_META[0]!), SITE_URL, BASE)
    const json = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(head)?.[1]
    const data = JSON.parse(json!) as Record<string, unknown>
    expect(data['@type']).toBe('WebApplication')
    expect(data.isAccessibleForFree).toBe(true)
    expect(json).not.toMatch(/<\/script/i)
  })

  it('escapes attribute values', () => {
    expect(escapeAttr(`a "b" <c> & d`)).toBe('a &quot;b&quot; &lt;c&gt; &amp; d')
  })

  it('marks pages as noindex when asked', () => {
    expect(renderHead({ ...homePage(), noindex: true }, SITE_URL, BASE)).toContain(
      '<meta name="robots" content="noindex" />',
    )
  })
})

describe('replaceHead', () => {
  it('swaps only the SEO block and keeps the rest of the page', () => {
    const built = `<head>\n<script src="/toolkit/assets/app.js"></script>\n${renderHead(homePage(), SITE_URL, BASE)}\n</head>`
    const tool = toolPage(TOOL_META[1]!)
    const out = replaceHead(built, renderHead(tool, SITE_URL, BASE))
    expect(out).toContain('<script src="/toolkit/assets/app.js"></script>')
    expect(out).toContain(`og/${TOOL_META[1]!.id}.png`)
    expect(out).not.toContain('og/home.png')
  })

  it('fails loudly if the markers are missing', () => {
    expect(() => replaceHead('<head></head>', '')).toThrow(/markers/)
  })
})

describe('sitemap, robots and manifest', () => {
  it('lists home and every tool in the sitemap', () => {
    const xml = renderSitemap(SITE_URL, '2026-10-03')
    expect(xml).toContain(`<loc>${SITE_URL}/</loc>`)
    for (const t of TOOL_META) expect(xml).toContain(`<loc>${SITE_URL}${t.path}/</loc>`)
    expect(xml.match(/<lastmod>2026-10-03<\/lastmod>/g)).toHaveLength(TOOL_META.length + 1)
  })

  it('points robots.txt at the sitemap', () => {
    expect(renderRobots(SITE_URL)).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
  })

  it('has installable icons and a shortcut per tool', () => {
    const m = renderManifest()
    expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true)
    expect(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any')).toBe(true)
    expect(m.shortcuts.map((s) => s.url)).toEqual(TOOL_META.map((t) => `${t.path.slice(1)}/`))
  })
})
