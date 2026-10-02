#!/usr/bin/env node
/**
 * Renders the social preview cards and app icons into public/ with headless Chrome:
 *
 *   public/og/home.png, public/og/<tool-id>.png   1200×630 Open Graph / Twitter cards
 *   public/icons/*.png                            favicon, Apple touch and PWA icons
 *
 * Fonts and the logo are inlined as data URIs, so output never depends on the network or on
 * system fonts. Re-run after changing tool names, descriptions or the brand:
 *
 *   pnpm generate:images        (set SITE_URL to print a different host on the cards)
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { SITE, TOOL_CATEGORIES, TOOL_META } from '../src/app/toolMeta.ts'

const root = new URL('..', import.meta.url).pathname
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const host = (process.env.SITE_URL ?? 'https://mazmk.github.io/screennest')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')

const dataUri = (path: string, type: string) =>
  `data:${type};base64,${readFileSync(join(root, path)).toString('base64')}`
const FONTS = `
@font-face { font-family: 'Instrument Serif'; src: url(${dataUri('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2', 'font/woff2')}) format('woff2'); }
@font-face { font-family: 'Geist'; font-weight: 100 900; src: url(${dataUri('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', 'font/woff2')}) format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-weight: 100 800; src: url(${dataUri('node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', 'font/woff2')}) format('woff2'); }`
const LOGO = dataUri('src/assets/logo-mark.svg', 'image/svg+xml')

// Brand tokens (light theme), mirrored from src/styles/tokens.css.
const C = {
  bg: '#f3f0e8',
  surface: '#fbfaf6',
  ink: '#16140f',
  muted: '#6b665b',
  line: '#d9d4c6',
  accent: '#e8451e',
  accentText: '#bc320e',
}

const ordered = TOOL_CATEGORIES.flatMap((c) => TOOL_META.filter((t) => t.category === c))
const num = (id: string) => String(ordered.findIndex((t) => t.id === id) + 1).padStart(2, '0')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const page = (
  body: string,
  size: [number, number],
) => `<!doctype html><html><head><meta charset="utf-8"><style>
${FONTS}
* { box-sizing: border-box; margin: 0; }
html, body { width: ${size[0]}px; height: ${size[1]}px; overflow: hidden; }
body { background: ${C.bg}; color: ${C.ink}; font-family: 'Geist', sans-serif; -webkit-font-smoothing: antialiased; }
.mono { font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.06em; }
.serif { font-family: 'Instrument Serif', serif; font-weight: 400; letter-spacing: -0.015em; }
</style></head><body>${body}</body></html>`

function card(content: {
  eyebrow: string
  title: string
  titleSize: number
  aside: string
  subline?: string
}) {
  return page(
    `<div style="position:relative;width:1200px;height:630px;padding:64px 72px;display:flex;flex-direction:column">
      <div style="position:absolute;inset:0;background-image:radial-gradient(${C.ink} 1.4px, transparent 1.6px);background-size:28px 28px;background-position:14px 14px;opacity:.07;-webkit-mask-image:linear-gradient(to bottom, #000, transparent 75%)"></div>
      <div style="position:relative;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:14px">
          <img src="${LOGO}" width="52" height="52">
          <span style="font-size:28px;font-weight:500;letter-spacing:-0.01em">${esc(SITE.name)}</span>
        </div>
        <span class="mono" style="font-size:18px;color:${C.muted}">${esc(content.eyebrow)}</span>
      </div>
      <div style="position:relative;flex:1;display:flex;align-items:center;gap:56px">
        <div style="flex:1;min-width:0">
          <h1 class="serif" style="font-size:${content.titleSize}px;line-height:0.95">${esc(content.title)}</h1>
          ${content.subline ? `<p style="margin-top:28px;font-size:30px;line-height:1.35;color:${C.muted};max-width:30ch">${esc(content.subline)}</p>` : ''}
        </div>
        ${content.aside}
      </div>
      <div style="position:relative;display:flex;justify-content:space-between;border-top:1.5px solid ${C.ink};padding-top:18px" class="mono">
        <span style="font-size:17px">Runs in your browser · Nothing is uploaded</span>
        <span style="font-size:17px;color:${C.muted};text-transform:none;letter-spacing:0">${esc(host)}</span>
      </div>
    </div>`,
    [1200, 630],
  )
}

const homeIndex = `<ol style="list-style:none;padding:0;width:360px;border-top:1px solid ${C.line}">
  ${ordered
    .map(
      (
        t,
      ) => `<li style="display:flex;gap:18px;align-items:baseline;padding:14px 4px;border-bottom:1px solid ${C.line}">
        <span class="mono" style="font-size:16px;color:${C.accentText}">${num(t.id)}</span>
        <span style="font-size:24px;font-weight:500">${esc(t.name)}</span></li>`,
    )
    .join('')}
</ol>`

const bigIndex = (id: string) =>
  `<div class="serif" style="font-size:300px;line-height:0.8;color:${C.accent}">${num(id)}</div>`

function icon(size: number, markScale: number) {
  const mark = Math.round(size * markScale)
  return page(
    `<div style="width:${size}px;height:${size}px;background:${C.ink};display:grid;place-items:center">
      <img src="${LOGO}" width="${mark}" height="${mark}"></div>`,
    [size, size],
  )
}

const jobs: { file: string; html: string; size: [number, number] }[] = [
  {
    file: 'public/og/home.png',
    size: [1200, 630],
    html: card({
      eyebrow: `Toolkit / ${String(ordered.length).padStart(2, '0')} tools`,
      title: SITE.tagline,
      titleSize: 112,
      aside: homeIndex,
    }),
  },
  ...TOOL_META.map((t) => ({
    file: `public/og/${t.id}.png`,
    size: [1200, 630] as [number, number],
    // Longer names step down so every title stays on one line.
    html: card({
      eyebrow: `Tool ${num(t.id)} / ${t.category}`,
      title: t.name,
      titleSize: t.name.length > 12 ? 100 : 128,
      subline: t.description,
      aside: bigIndex(t.id),
    }),
  })),
  // Full-bleed squares: iOS rounds the corners itself, and transparent corners render black.
  { file: 'public/icons/favicon-32.png', size: [32, 32], html: icon(32, 0.86) },
  { file: 'public/icons/apple-touch-icon.png', size: [180, 180], html: icon(180, 0.78) },
  { file: 'public/icons/icon-192.png', size: [192, 192], html: icon(192, 0.78) },
  { file: 'public/icons/icon-512.png', size: [512, 512], html: icon(512, 0.78) },
  // Maskable: keep the mark inside the 80% safe zone.
  { file: 'public/icons/icon-maskable-512.png', size: [512, 512], html: icon(512, 0.58) },
]

// --- minimal DevTools-protocol client ------------------------------------------------------------
const port = 9400 + Math.floor(Math.random() * 400)
const profile = join(tmpdir(), `toolkit-images-${port}`)
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' },
)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let ws: WebSocket | undefined
for (let i = 0; i < 80 && !ws; i++) {
  try {
    const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
      type: string
      webSocketDebuggerUrl: string
    }[]
    const target = targets.find((t) => t.type === 'page')
    if (target) ws = new WebSocket(target.webSocketDebuggerUrl)
  } catch {
    // Chrome still starting
  }
  if (!ws) await sleep(150)
}
if (!ws) throw new Error(`Couldn't start Chrome at ${CHROME} (set CHROME_PATH)`)
const socket = ws
await new Promise((r) => socket.addEventListener('open', r, { once: true }))

let nextId = 0
const pending = new Map<number, (v: { result?: Record<string, unknown> }) => void>()
socket.addEventListener('message', (e) => {
  const msg = JSON.parse(String(e.data)) as { id?: number; result?: Record<string, unknown> }
  if (msg.id !== undefined) pending.get(msg.id)?.(msg)
})
const send = (method: string, params: Record<string, unknown> = {}) =>
  new Promise<{ result?: Record<string, unknown> }>((resolve) => {
    const id = ++nextId
    pending.set(id, resolve)
    socket.send(JSON.stringify({ id, method, params }))
  })

await send('Page.enable')
try {
  for (const job of jobs) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: job.size[0],
      height: job.size[1],
      deviceScaleFactor: 1,
      mobile: false,
    })
    const loaded = new Promise<void>((resolve) => {
      const onMsg = (e: MessageEvent) => {
        if ((JSON.parse(String(e.data)) as { method?: string }).method === 'Page.loadEventFired') {
          socket.removeEventListener('message', onMsg)
          resolve()
        }
      }
      socket.addEventListener('message', onMsg)
    })
    await send('Page.navigate', {
      url: `data:text/html;base64,${Buffer.from(job.html).toString('base64')}`,
    })
    await loaded
    await send('Runtime.evaluate', {
      expression: 'document.fonts.ready.then(() => true)',
      awaitPromise: true,
    })
    await sleep(100)
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: job.size[0], height: job.size[1], scale: 1 },
    })
    const out = join(root, job.file)
    mkdirSync(join(out, '..'), { recursive: true })
    writeFileSync(out, Buffer.from(String(shot.result?.data), 'base64'))
    console.log(`✓ ${job.file} (${job.size.join('×')})`)
  }
} finally {
  chrome.kill('SIGKILL')
  rmSync(profile, { recursive: true, force: true })
}
process.exit(0)
