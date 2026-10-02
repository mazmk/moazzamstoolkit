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
  },
]

/** The document title for a page — shared by the static HTML (build/seo.ts) and the app. */
export function pageTitle(tool?: Pick<ToolMeta, 'seoTitle'>): string {
  return tool
    ? `${tool.seoTitle} · ${SITE.name}`
    : `${SITE.name} — ${SITE.tagline.replace(/\.$/, '')}`
}
