# ScreenNest

A browser-based tool for two things:

1. **Screen Recorder** — record your screen directly in the browser using the `getDisplayMedia` API and `MediaRecorder`, with recordings saved locally via IndexedDB.
2. **Video Downloader** — download videos from developer tools like Loom and Jam (requires a proxy worker due to CORS; see `worker/`).

## Stack

- **Vite + React + TypeScript** (strict mode)
- **Tailwind CSS v4** via the Vite plugin
- **React Router** for `/record` and `/download` routes
- **Zustand** for state management
- **idb-keyval** for IndexedDB storage
- **fix-webm-duration** to patch WebM duration metadata
- **lucide-react** for icons
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

worker/                  # future Cloudflare Worker proxy (see worker/README.md)
```
