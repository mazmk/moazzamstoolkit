/**
 * Build-time SEO and link previews.
 *
 * Link-preview scrapers (Slack, iMessage, X, LinkedIn, WhatsApp, Discord) don't run JavaScript, so
 * everything they need must be in static HTML. This plugin:
 *   - injects the full <head> (title, description, canonical, Open Graph, Twitter, JSON-LD, icons)
 *     into index.html at the `<!-- seo -->` marker
 *   - writes dist/<tool>/index.html per tool with that tool's title, description and preview card,
 *     so a shared /markdown link previews as the Markdown Viewer (and is served with HTTP 200)
 *   - writes 404.html (SPA fallback, noindex), robots.txt (AI crawlers named explicitly),
 *     llms.txt + llms-full.txt (llmstxt.org), sitemap.xml and manifest.webmanifest
 *
 * Absolute URLs come from SITE_URL (set by the Pages workflow), falling back to the default below.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'

import { SITE, TOOL_META, pageTitle, type ToolMeta } from '../src/app/toolMeta.ts'

export const DEFAULT_SITE_URL = 'https://mazmk.github.io/screennest'

const START = '<!-- seo:start -->'
const END = '<!-- seo:end -->'
const MARKER = '<!-- seo -->'

export interface PageMeta {
  title: string
  ogTitle: string
  description: string
  /** Path relative to the site root, with a trailing slash: "" for home, "record/" for a tool. */
  path: string
  /** Preview card, relative to the site root, e.g. "og/home.png". */
  image: string
  imageAlt: string
  tool?: ToolMeta
  noindex?: boolean
}

export const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** JSON for an inline <script>: `<` is escaped so content can't close the tag. */
const inlineJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

const APP_CATEGORY: Record<string, string> = {
  Video: 'MultimediaApplication',
  Documents: 'UtilitiesApplication',
  Developer: 'DeveloperApplication',
}

export const homePage = (): PageMeta => ({
  title: pageTitle(),
  ogTitle: SITE.name,
  description: SITE.description,
  path: '',
  image: 'og/home.png',
  imageAlt: `${SITE.name} — ${SITE.tagline} A numbered index of ${TOOL_META.length} browser tools.`,
})

export const toolPage = (tool: ToolMeta): PageMeta => ({
  title: pageTitle(tool),
  ogTitle: tool.seoTitle,
  description: tool.seoDescription,
  path: `${tool.path.replace(/^\//, '')}/`,
  image: `og/${tool.id}.png`,
  imageAlt: `${tool.name} — ${tool.description}`,
  tool,
})

function structuredData(page: PageMeta, siteUrl: string) {
  const author = { '@type': 'Person', name: SITE.author }
  const app = (tool: ToolMeta) => ({
    '@type': 'WebApplication',
    name: tool.seoTitle,
    alternateName: tool.name,
    description: tool.seoDescription,
    url: `${siteUrl}/${toolPage(tool).path}`,
    image: `${siteUrl}/og/${tool.id}.png`,
    applicationCategory: APP_CATEGORY[tool.category] ?? 'UtilitiesApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript and a modern browser.',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author,
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: `${siteUrl}/` },
  })

  if (page.tool) return { '@context': 'https://schema.org', ...app(page.tool) }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: SITE.name,
        description: SITE.description,
        url: `${siteUrl}/`,
        inLanguage: 'en',
        author,
      },
      {
        '@type': 'ItemList',
        name: 'Tools',
        itemListElement: TOOL_META.map((tool, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: app(tool),
        })),
      },
    ],
  }
}

/** The SEO <head> block for one page. `base` is Vite's base path, used for local icon links. */
export function renderHead(page: PageMeta, siteUrl: string, base: string): string {
  const url = `${siteUrl}/${page.path}`
  const image = `${siteUrl}/${page.image}`
  const a = escapeAttr
  const lines = [
    `<title>${a(page.title)}</title>`,
    `<meta name="description" content="${a(page.description)}" />`,
    `<link rel="canonical" href="${a(url)}" />`,
    page.noindex
      ? `<meta name="robots" content="noindex" />`
      : `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta name="author" content="${a(SITE.author)}" />`,
    `<meta name="application-name" content="${a(SITE.name)}" />`,
    `<meta name="apple-mobile-web-app-title" content="${a(SITE.shortName)}" />`,
    `<meta name="mobile-web-app-capable" content="yes" />`,
    `<meta name="format-detection" content="telephone=no" />`,
    `<meta name="theme-color" content="${SITE.themeColor.light}" media="(prefers-color-scheme: light)" />`,
    `<meta name="theme-color" content="${SITE.themeColor.dark}" media="(prefers-color-scheme: dark)" />`,
    `<link rel="icon" href="${base}favicon.svg" type="image/svg+xml" />`,
    `<link rel="icon" href="${base}icons/favicon-32.png" type="image/png" sizes="32x32" />`,
    `<link rel="apple-touch-icon" href="${base}icons/apple-touch-icon.png" />`,
    `<link rel="manifest" href="${base}manifest.webmanifest" />`,
    `<link rel="sitemap" type="application/xml" href="${base}sitemap.xml" />`,
    `<link rel="alternate" type="text/markdown" title="Summary for language models" href="${base}llms.txt" />`,
    // Open Graph — Facebook, LinkedIn, Slack, iMessage, WhatsApp, Discord
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${a(SITE.name)}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:url" content="${a(url)}" />`,
    `<meta property="og:title" content="${a(page.ogTitle)}" />`,
    `<meta property="og:description" content="${a(page.description)}" />`,
    `<meta property="og:image" content="${a(image)}" />`,
    `<meta property="og:image:secure_url" content="${a(image)}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${a(page.imageAlt)}" />`,
    // X / Twitter
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${a(page.ogTitle)}" />`,
    `<meta name="twitter:description" content="${a(page.description)}" />`,
    `<meta name="twitter:image" content="${a(image)}" />`,
    `<meta name="twitter:image:alt" content="${a(page.imageAlt)}" />`,
    `<script type="application/ld+json">${inlineJson(structuredData(page, siteUrl))}</script>`,
  ]
  return [START, ...lines, END]
    .map((l) => `    ${l}`)
    .join('\n')
    .trimStart()
}

export function renderSitemap(siteUrl: string, lastmod: string): string {
  const urls = [homePage(), ...TOOL_META.map(toolPage)].map(
    (p) =>
      `  <url>\n    <loc>${escapeAttr(`${siteUrl}/${p.path}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
  )
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

/**
 * AI crawlers and agents, by user-agent token. Everything is allowed for everyone anyway; naming
 * them makes that explicit for crawlers that only read their own group.
 */
export const AI_AGENTS = [
  'GPTBot', // OpenAI training
  'OAI-SearchBot', // ChatGPT search
  'ChatGPT-User', // ChatGPT browsing on a user's behalf
  'ClaudeBot', // Anthropic training
  'Claude-SearchBot', // Claude search
  'Claude-User', // Claude browsing on a user's behalf
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended', // Gemini / Vertex AI
  'Applebot-Extended', // Apple Intelligence
  'Meta-ExternalAgent',
  'Amazonbot',
  'DuckAssistBot',
  'MistralAI-User',
  'CCBot', // Common Crawl, used by many open models
]

export const renderRobots = (siteUrl: string) =>
  [
    `# ${SITE.name} — every page is public. Search engines, AI crawlers and agents are welcome.`,
    `# Summary for language models: ${siteUrl}/llms.txt`,
    `# Full reference for language models: ${siteUrl}/llms-full.txt`,
    '',
    'User-agent: *',
    'Allow: /',
    '',
    ...AI_AGENTS.map((agent) => `User-agent: ${agent}`),
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')

const PRIVACY =
  'Every tool runs entirely in the browser. Files, recordings and documents are processed on the user’s device and never uploaded; there are no accounts, no sign-up and no cost.'

/** llms.txt (llmstxt.org): a short Markdown map of the site for language models. */
export function renderLlmsTxt(siteUrl: string): string {
  const tools = TOOL_META.map(
    (t) => `- [${t.name}](${siteUrl}/${toolPage(t).path}): ${t.seoDescription}`,
  )
  return [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    `${PRIVACY} It needs a modern browser with JavaScript; screen recording needs a desktop browser.`,
    '',
    '## Tools',
    '',
    ...tools,
    '',
    '## Optional',
    '',
    `- [Full reference](${siteUrl}/llms-full.txt): what each tool does, how, and its limits`,
    `- [Sitemap](${siteUrl}/sitemap.xml)`,
    '',
  ].join('\n')
}

/** llms-full.txt: everything an AI assistant needs to answer questions about the tools accurately. */
export function renderLlmsFullTxt(siteUrl: string): string {
  const sections = TOOL_META.map((t) =>
    [
      `## ${t.name}`,
      '',
      `URL: ${siteUrl}/${toolPage(t).path}`,
      `Category: ${t.category}`,
      '',
      t.seoDescription,
      '',
      '### What it does',
      '',
      ...t.capabilities.map((c) => `- ${c}`),
      '',
      '### Limits',
      '',
      ...t.limits.map((l) => `- ${l}`),
      '',
    ].join('\n'),
  )
  return [
    `# ${SITE.name} — full reference`,
    '',
    `> ${SITE.description}`,
    '',
    `Home: ${siteUrl}/`,
    `Author: ${SITE.author}`,
    '',
    '## Privacy and requirements',
    '',
    `- ${PRIVACY}`,
    '- Needs a modern browser with JavaScript. Screen recording needs a desktop browser.',
    '- Nothing to install. Tools can be opened directly by URL and installed as an app (PWA).',
    '',
    ...sections,
  ].join('\n')
}

/** PWA manifest with one app shortcut per tool. URLs are relative to the manifest's location. */
export function renderManifest() {
  return {
    id: './',
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    lang: 'en',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: SITE.themeColor.light,
    theme_color: SITE.themeColor.light,
    categories: ['productivity', 'utilities'],
    icons: [
      { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: 'icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: TOOL_META.map((tool) => ({
      name: tool.name,
      short_name: tool.name,
      description: tool.description,
      url: toolPage(tool).path,
      icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    })),
  }
}

/** Swaps the SEO block of an already-built HTML page for another page's. */
export function replaceHead(html: string, head: string): string {
  const start = html.indexOf(START)
  const end = html.indexOf(END)
  if (start === -1 || end === -1) throw new Error('SEO markers not found in built index.html')
  return html.slice(0, start) + head + html.slice(end + END.length)
}

export function seo(): Plugin {
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
  let base = '/'
  let outDir = 'dist'

  return {
    name: 'toolkit-seo',
    configResolved(config) {
      base = config.base
      outDir = join(config.root, config.build.outDir)
    },
    transformIndexHtml(html) {
      if (!html.includes(MARKER)) throw new Error(`index.html is missing the ${MARKER} marker`)
      return html.replace(MARKER, renderHead(homePage(), siteUrl, base))
    },
    // Serve the generated manifest in dev too.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        const text: Record<string, () => string> = {
          '/robots.txt': () => renderRobots(siteUrl),
          '/llms.txt': () => renderLlmsTxt(siteUrl),
          '/llms-full.txt': () => renderLlmsFullTxt(siteUrl),
        }
        const file = Object.keys(text).find((f) => path.endsWith(f))
        if (file) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(text[file]!())
          return
        }
        if (path.endsWith('/manifest.webmanifest')) {
          res.setHeader('Content-Type', 'application/manifest+json')
          res.end(JSON.stringify(renderManifest(), null, 2))
          return
        }
        next()
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify(renderManifest(), null, 2),
      })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: renderRobots(siteUrl) })
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: renderLlmsTxt(siteUrl) })
      this.emitFile({
        type: 'asset',
        fileName: 'llms-full.txt',
        source: renderLlmsFullTxt(siteUrl),
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: renderSitemap(siteUrl, new Date().toISOString().slice(0, 10)),
      })
    },
    // index.html is final only after the bundle is written, so derive the other pages from it then.
    writeBundle() {
      const index = readFileSync(join(outDir, 'index.html'), 'utf8')
      const write = (file: string, html: string) => {
        const path = join(outDir, file)
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(path, html)
      }
      for (const tool of TOOL_META) {
        const page = toolPage(tool)
        write(join(page.path, 'index.html'), replaceHead(index, renderHead(page, siteUrl, base)))
      }
      // SPA fallback for unknown paths: the app renders its 404 page; crawlers shouldn't index it.
      write(
        '404.html',
        replaceHead(
          index,
          renderHead(
            { ...homePage(), title: `Not found · ${SITE.name}`, noindex: true },
            siteUrl,
            base,
          ),
        ),
      )
    },
  }
}
