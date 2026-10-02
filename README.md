# ScreenNest

A browser-based tool for two things:

1. **Screen Recorder** — record your screen (with a draggable webcam bubble) or just your webcam, using `getDisplayMedia`, `getUserMedia` and `MediaRecorder`. Recordings are saved locally via IndexedDB.
2. **Video Downloader** — download Loom videos from a share link. Loom's endpoints allow cross-origin requests, so everything runs in the browser: newer videos are DASH streams whose separate audio/video tracks are merged client-side with [mediabunny](https://mediabunny.dev) (no re-encoding). Jam support is not implemented yet — Jam has no public endpoint for a recording's video.

Light, dark and system themes are supported.

## Design system

The UI uses a translucent "glass" material over a slowly drifting ambient background.

- **Tokens** — `src/styles/tokens.css`: every color, radius, shadow, blur and easing value, per theme. Text colors were checked for WCAG AA against glass composited over the background blobs; re-check if you change blob colors or glass alpha. `--fg-subtle` is for text on glass only.
- **Materials** — `src/styles/glass.css`: `glass` (cards), `glass-strong` (floating chrome), `glass-pill` (pills on the background) and `glass-inset` (controls inside glass — no backdrop-filter, so blurs never nest), with fallbacks for no `backdrop-filter`, `prefers-reduced-transparency` and `prefers-reduced-motion`.
- **Components** — `src/shared/ui/`: `GlassCard`, `GlassButton`, `GlassPill`, `GlassInput`, `Segmented`, `Chip`, `Toast`, `InlineError`. Controls inside a `GlassCard` switch to the inset material automatically.

## Stack

- **Vite + React + TypeScript** (strict mode)
- **Tailwind CSS v4** via the Vite plugin
- **React Router** for `/record` and `/download` routes
- **Zustand** for state management
- **mediabunny** to merge DASH audio/video into one WebM (lazy-loaded)
- **idb-keyval** for IndexedDB storage
- **fix-webm-duration** to patch WebM duration metadata
- **lucide-react** for icons (1.5px stroke)
- **Motion** for page transitions and the nav indicator (lazy-loaded); everything else is CSS
- **Geist / Geist Mono** via Fontsource (self-hosted, no font CDN)
- **Vitest + React Testing Library** for tests

## Setup

```bash
# requires Node 22 (see .nvmrc)
nvm use

pnpm install
```

## Run

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm dev`         | Start local dev server               |
| `pnpm build`       | Type-check and build for production  |
| `pnpm preview`     | Preview the production build locally |
| `pnpm lint`        | Run ESLint                           |
| `pnpm format`      | Format all source files with Prettier|
| `pnpm test`        | Run Vitest in watch mode             |
| `pnpm typecheck`   | Run TypeScript type checker          |

## Project structure

```
src/
  app/                   # router, layout
  features/
    recorder/            # components/, hooks/, lib/, store.ts
    downloader/          # components/, hooks/, lib/
  shared/                # shared UI components, utils, types
  main.tsx

worker/                  # placeholder for a CORS proxy, if a future provider needs one
```
