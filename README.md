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

Adding a tool is one registry entry plus a feature folder. Routes, the home grid, the **Tools** menu and the command palette are all generated from the registry.

1. **Create a feature folder** with a default-exported page:

   ```
   src/features/my-tool/
     components/MyToolPage.tsx   # export default function MyToolPage() { … }
     lib/                        # logic + pure helpers (with *.test.ts next to them)
   ```

2. **Register it** in [`src/app/tools.ts`](src/app/tools.ts):

   ```ts
   {
     id: 'my-tool',                       // unique, kebab-case
     name: 'My Tool',
     description: 'One sentence for the home card and command palette.',
     icon: Wrench,                        // any lucide-react icon
     path: '/my-tool',                    // unique, kebab-case
     category: 'Developer',               // one of TOOL_CATEGORIES
     keywords: ['extra', 'search', 'terms'],
     layout: 'narrow',                    // or 'full' to fill the viewport (e.g. editors)
     component: lazy(() => import('@/features/my-tool/components/MyToolPage')),
   },
   ```

   `component` must stay a `lazy()` import, so the tool's dependencies load only on its page. Add a category to `TOOL_CATEGORIES` if none fit.

3. **Build the UI from the shared components** in `src/shared/ui/` (see below): start the page with `<PageHeader toolId="my-tool" …/>` and put content in `<Panel>`s.

The registry test (`src/app/tools.test.ts`) checks that ids and paths are unique and well-formed.

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

Pushes to `main` deploy to GitHub Pages via `.github/workflows/static.yml`.

## Project structure

```
src/
  app/
    tools.ts               # tool registry — routes, nav, home grid and palette come from here
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
scripts/
  check-contrast.mjs
```
