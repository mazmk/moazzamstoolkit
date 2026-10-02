# Moazzam's Toolkit

Small tools for annoying jobs. Everything runs in your browser — nothing is uploaded anywhere.

## Tools

| Tool | Path | What it does |
| --- | --- | --- |
| **Screen Recorder** | `/record` | Record your screen (with a draggable webcam bubble) or just your webcam with `getDisplayMedia`, `getUserMedia` and `MediaRecorder`. Recordings are saved locally in IndexedDB. |
| **Video Downloader** | `/download` | Save Loom videos from a share link. Loom's endpoints allow cross-origin requests, so it runs fully in the browser; newer DASH videos have their audio and video merged client-side with [mediabunny](https://mediabunny.dev) (no re-encoding). Jam isn't supported yet — it has no public endpoint for a recording's video. |
| **WebM to MP4** | `/webm-to-mp4` | Convert WebM (e.g. browser recordings) to H.264/AAC MP4 with [ffmpeg.wasm](https://ffmpegwasm.netlify.app). Uses the single-threaded core, so no COOP/COEP headers are needed. The ~32 MB core is self-hosted and only downloads when the page is opened. |
| **Markdown Viewer** | `/markdown` | Live GFM preview with syntax highlighting and sanitized output, synced scrolling, autosave, and export to Markdown, self-contained HTML, or PDF (via the print dialog). |

Light, dark and system themes are supported. Press <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> to jump between tools.

## How to add a new tool

Routes, the home index, the **Tools** menu, the command palette and the per-page SEO/link-preview HTML are all generated from the registry.

1. **Create a feature folder** with a default-exported page:

   ```
   src/features/my-tool/
     components/MyToolPage.tsx   # export default function MyToolPage() { … }
     lib/                        # logic + pure helpers (with *.test.ts next to them)
   ```

2. **Describe it** in [`src/app/toolMeta.ts`](src/app/toolMeta.ts) (plain data, also read at build time):

   ```ts
   {
     id: 'my-tool',                        // unique, kebab-case; also names og/my-tool.png
     name: 'My Tool',
     description: 'One sentence for the home index and command palette.',
     path: '/my-tool',
     category: 'Developer',                // one of TOOL_CATEGORIES
     keywords: ['extra', 'search', 'terms'],
     seoTitle: 'My Tool for Doing X',      // <title> / og:title — keep it short
     seoDescription: '~150 characters for search results and link previews.',
   },
   ```

3. **Wire up the UI** in [`src/app/tools.ts`](src/app/tools.ts): add `'my-tool': { icon, component: lazy(() => import('@/features/my-tool/components/MyToolPage')) }`. Keep it a `lazy()` import so the tool's dependencies load only on its page.

4. **Regenerate the preview cards**: `pnpm generate:images` (writes `public/og/my-tool.png`).

Start the page with `<PageHeader toolId="my-tool" …/>` and put content in `<Panel>`s. The registry and SEO tests check that ids and paths are unique and every page gets complete metadata.

## Link previews & SEO

Link-preview scrapers (Slack, iMessage, X, LinkedIn, WhatsApp, Discord) don't run JavaScript, so [`build/seo.ts`](build/seo.ts) writes everything into static HTML at build time:

- the full `<head>` for every page: title, description, canonical URL, Open Graph and Twitter `summary_large_image` tags, JSON-LD (`WebSite` + `ItemList` on home, `WebApplication` per tool), favicon, Apple touch icon and manifest links
- **a real HTML file per tool** (`dist/markdown/index.html`, …), so a shared tool link previews as that tool and is served with HTTP 200
- `404.html` (SPA fallback, `noindex`), `robots.txt`, `sitemap.xml`, and `manifest.webmanifest` with one app shortcut per tool

Preview cards (1200×630) and app icons live in `public/og/` and `public/icons/`; they're generated from the brand fonts and tokens with headless Chrome by `pnpm generate:images` and committed. Absolute URLs come from `SITE_URL`, which the Pages workflow sets from the deployment URL.

To check a deployed preview, paste a URL into [opengraph.xyz](https://www.opengraph.xyz) or the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/). Platforms cache previews, so re-scrape after changing an image.

## Design system

"Workshop bench / editorial tool index": warm paper, ink-black type, one hot accent, flat solid surfaces, hairline borders and mono details.

- **Tokens** — [`src/styles/tokens.css`](src/styles/tokens.css): `--bg`, `--surface`, `--surface-2`, `--ink`, `--muted`, `--line`, `--accent`, `--accent-ink`, `--accent-text` (plus status colors) for both themes. `--accent` is for fills, borders, icons and large text only; small accent text uses `--accent-text`.
- **Tailwind mapping** — [`src/index.css`](src/index.css): `bg-paper`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, `text-accent-text`, `rounded-control` (10px), `rounded-panel` (14px), `font-display` / `font-sans` / `font-mono`.
- **Materials** — `panel` for every page surface (solid, 1px line, no blur or shadow). `glass-float` *only* for things that float above content: navbar, command palette, dropdowns, recorder control bar, toasts. Glass falls back to solid `--surface` under `prefers-reduced-transparency`.
- **Type** — Instrument Serif (home headline and page titles), Geist (UI), JetBrains Mono (labels, indexes, shortcuts, timers, sizes). Self-hosted via Fontsource.
- **Contrast** — `pnpm check:contrast` checks every text/background pair in both themes (4.5:1 text, 3:1 accent fills and icons).
- **Components** — `src/shared/ui/`: `Panel`, `Button`, `Tag`, `TextField`, `Chip`, `Segmented`, `Menu`, `Toast`, `ProgressBar`, `FileDropzone`, `SplitPane`, `InlineError`, `PageHeader`, `Backdrop`. Selected chips and toggles are ink-filled, never accent.

## Stack

- **Vite + React 19 + TypeScript** (strict) · **Tailwind CSS v4** · **React Router** · **Zustand**
- **ffmpeg.wasm 0.12** (`@ffmpeg/ffmpeg`, `@ffmpeg/util`, single-threaded `@ffmpeg/core`)
- **react-markdown + remark-gfm + rehype-sanitize + rehype-highlight**
- **mediabunny**, **idb-keyval**, **fix-webm-duration**
- **lucide-react** icons (1.5px stroke) · **Instrument Serif, Geist, JetBrains Mono** via Fontsource (self-hosted)
- **Vitest + React Testing Library**

## Setup

```bash
# requires Node 22 (see .nvmrc)
nvm use
pnpm install
```

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run the TypeScript checker |
| `pnpm test` | Run Vitest in watch mode |
| `pnpm format` | Format with Prettier |
| `pnpm check:contrast` | Verify design-token contrast (WCAG AA) |
| `pnpm generate:images` | Re-render link-preview cards and app icons (needs Chrome) |

Pushes to `main` deploy to GitHub Pages via `.github/workflows/static.yml`.

## Project structure

```
src/
  app/
    toolMeta.ts            # names, paths and SEO copy (plain data, also used at build time)
    tools.ts               # tool registry — adds icons and lazy pages to toolMeta
    router.tsx             # routes generated from the registry
    Layout.tsx             # floating navbar (Tools menu, ⌘K, theme), page fade, footer
    CommandPalette.tsx
  features/
    home/                  # home grid, 404
    recorder/              # Screen Recorder
    downloader/            # Video Downloader
    webm-to-mp4/           # components/ + lib/ (useFfmpegConverter, args builder, helpers)
    markdown/              # components/ + lib/ (export builders, document helpers)
  shared/
    ui/                    # glass components
    hooks/  lib/  theme/  components/
  assets/
    logo-mark.svg
  styles/
    tokens.css
build/
  seo.ts                 # Vite plugin: meta tags, per-tool pages, sitemap, robots, manifest
scripts/
  check-contrast.mjs
  generate-images.mts    # preview cards + app icons
public/
  favicon.svg  og/  icons/
```
