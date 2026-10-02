/**
 * Plain-data metadata for the site and each tool — no React, no icons — so it can be shared by the
 * app (tools.ts), the build-time SEO plugin (build/seo.ts) and the preview-image script.
 * Order here is the order tools appear everywhere.
 */

export const TOOL_CATEGORIES = ['Video', 'Documents', 'Developer'] as const
export type ToolCategory = (typeof TOOL_CATEGORIES)[number]

export const SITE = {
  name: 'Moazzam’s Toolkit',
  shortName: 'Toolkit',
  author: 'Moazzam Ali',
  tagline: 'Small tools for annoying jobs.',
  description:
    'Free browser tools for annoying jobs: record your screen, download Loom videos, convert WebM to MP4 and write Markdown. Everything runs on your device — nothing is uploaded.',
  locale: 'en_US',
  themeColor: { light: '#f3f0e8', dark: '#121110' },
} as const

export interface ToolMeta {
  /** Stable, unique identifier (kebab-case). Also names the preview image: og/<id>.png. */
  id: string
  name: string
  /** One sentence for the home index and command palette. */
  description: string
  /** Absolute route path, e.g. "/record". */
  path: string
  category: ToolCategory
  /** `narrow` uses the centred column; `full` fills the viewport below the navbar. */
  layout?: 'narrow' | 'full'
  /** Extra words the command palette should match on. */
  keywords?: string[]
  /** Search-phrased name for <title> and og:title; kept short so it isn't truncated. */
  seoTitle: string
  /** Meta and og description, ~150 characters. */
  seoDescription: string
  /** Plain-language facts for llms-full.txt: what the tool does and how. */
  capabilities: string[]
  /** Honest limits, so AI assistants don't over-promise on the tool's behalf. */
  limits: string[]
}

export const TOOL_META: ToolMeta[] = [
  {
    id: 'screen-recorder',
    name: 'Screen Recorder',
    description: 'Record your screen or webcam, with a draggable webcam bubble.',
    path: '/record',
    category: 'Video',
    keywords: ['capture', 'camera', 'webcam', 'loom'],
    seoTitle: 'Free Screen & Webcam Recorder',
    seoDescription:
      'Record your screen with a draggable webcam bubble, or just your webcam, right in the browser. No install, no sign-up, and recordings never leave your device.',
    capabilities: [
      'Records a screen, window or tab, with your webcam composited in as a round bubble you can drag, resize (S/M/L) or hide — even while recording.',
      'Webcam-only mode ("Webcam test") with a 3-2-1 countdown.',
      'Microphone on/off before recording; tab or system audio is mixed with the mic when the browser shares it.',
      'Recordings are saved as WebM in the browser’s IndexedDB, then previewed, downloaded or deleted from a recordings grid.',
    ],
    limits: [
      'Needs camera and microphone permission before it can record.',
      'Screen capture needs a desktop browser; mobile browsers can only use webcam mode.',
      'Output is WebM — use the WebM to MP4 tool for an MP4. There is no pause or trim.',
      'Recordings live only in the browser they were made in; clearing site data deletes them.',
    ],
  },
  {
    id: 'video-downloader',
    name: 'Video Downloader',
    description: 'Save Loom videos to your device from a share link.',
    path: '/download',
    category: 'Video',
    keywords: ['loom', 'jam', 'save'],
    seoTitle: 'Loom Video Downloader',
    seoDescription:
      'Paste a Loom share link and save the video to your device in the quality you want. Audio and video are merged in your browser — nothing is uploaded.',
    capabilities: [
      'Downloads public Loom videos from a loom.com/share/… link, showing the title, thumbnail and duration first.',
      'Lets you pick the quality when Loom offers more than one (for example 1080p or 720p).',
      'Newer Loom videos are streamed as separate audio and video; they are downloaded and merged into one WebM in the browser without re-encoding. Older videos download as MP4 directly.',
      'Shows download progress and can be cancelled.',
    ],
    limits: [
      'Only Loom is supported. Jam (jam.dev) links are recognised but not supported yet.',
      'Private, password-protected or deleted Loom videos can’t be downloaded.',
      'The whole video is held in memory while downloading, so very long 1080p videos need plenty of RAM.',
    ],
  },
  {
    id: 'webm-to-mp4',
    name: 'WebM to MP4',
    description: 'Convert browser recordings to MP4 that plays everywhere.',
    path: '/webm-to-mp4',
    category: 'Video',
    keywords: ['convert', 'ffmpeg', 'h264', 'transcode'],
    seoTitle: 'WebM to MP4 Converter',
    seoDescription:
      'Convert WebM screen recordings to H.264 MP4 that plays everywhere. Pick a resolution and quality; conversion runs on your device with ffmpeg, no upload.',
    capabilities: [
      'Converts .webm files to MP4 (H.264 video, AAC audio, fast-start) using ffmpeg compiled to WebAssembly, entirely in the browser.',
      'Resolution: Original, 1080p, 720p or 480p — never upscales. Compression: Smaller file, Balanced or Best quality (x264 CRF 28 / 23 / 18).',
      'Forces a constant 30 fps so variable-frame-rate browser recordings stay in sync; files without audio convert fine.',
      'Shows progress, elapsed time and an ETA; conversions can be cancelled. The result can be previewed before downloading.',
    ],
    limits: [
      'The converter (about 32 MB) downloads the first time the page is opened, then is cached for the session.',
      'Files over about 500 MB may run out of browser memory; choosing a lower resolution helps.',
      'Single-threaded, so it’s slower than a desktop app. Only WebM input is accepted.',
    ],
  },
  {
    id: 'markdown-viewer',
    name: 'Markdown Viewer',
    description: 'Write markdown with a live preview, then export to HTML or PDF.',
    path: '/markdown',
    category: 'Documents',
    layout: 'full',
    keywords: ['md', 'editor', 'preview', 'pdf', 'readme'],
    seoTitle: 'Markdown Viewer & Editor',
    seoDescription:
      'Write GitHub-flavoured Markdown with a live, syntax-highlighted preview. Autosaves in your browser and exports to Markdown, self-contained HTML or PDF.',
    capabilities: [
      'Side-by-side editor and live preview with a resizable divider and synced scrolling; Edit/Preview tabs on small screens.',
      'GitHub-flavoured Markdown: tables, task lists, strikethrough and autolinks, with syntax-highlighted code blocks. Output is sanitized, so pasted Markdown can’t run scripts.',
      'Autosaves to the browser; drop a .md or .txt file onto the editor to open it. Word count, character count and reading time.',
      'Exports to Markdown (.md), a self-contained styled HTML file (works offline, light and dark), or PDF via the browser’s print dialog; can also copy the rendered HTML.',
    ],
    limits: [
      'The editor is a plain text area (no line numbers or Markdown shortcuts).',
      'PDF export uses the browser’s print dialog — choose “Save as PDF”.',
      'Documents are stored only in this browser.',
    ],
  },
]

/** The document title for a page — shared by the static HTML (build/seo.ts) and the app. */
export function pageTitle(tool?: Pick<ToolMeta, 'seoTitle'>): string {
  return tool
    ? `${tool.seoTitle} · ${SITE.name}`
    : `${SITE.name} — ${SITE.tagline.replace(/\.$/, '')}`
}
