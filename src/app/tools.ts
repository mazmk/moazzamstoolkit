import { Download, FileText, FileVideo, Video, type LucideIcon } from 'lucide-react'
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * The tool registry. Routes, the home grid, the Tools menu and the command palette are all
 * generated from this list — adding a tool is one entry here plus a feature folder.
 */

export const TOOL_CATEGORIES = ['Video', 'Documents', 'Developer'] as const
export type ToolCategory = (typeof TOOL_CATEGORIES)[number]

export interface ToolDefinition {
  /** Stable, unique identifier (kebab-case). */
  id: string
  name: string
  /** One sentence for the home card and command palette. */
  description: string
  icon: LucideIcon
  /** Absolute route path, e.g. "/record". */
  path: string
  category: ToolCategory
  /** Lazy so each tool's dependencies load only when its page is opened. */
  component: LazyExoticComponent<ComponentType>
  /** `narrow` uses the centered 720px column; `full` fills the viewport below the navbar. */
  layout?: 'narrow' | 'full'
  /** Extra words the command palette should match on. */
  keywords?: string[]
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'screen-recorder',
    name: 'Screen Recorder',
    description: 'Record your screen or webcam, with a draggable webcam bubble.',
    icon: Video,
    path: '/record',
    category: 'Video',
    keywords: ['capture', 'camera', 'webcam', 'loom'],
    component: lazy(() =>
      import('@/features/recorder/components/RecorderPage').then((m) => ({
        default: m.RecorderPage,
      })),
    ),
  },
  {
    id: 'video-downloader',
    name: 'Video Downloader',
    description: 'Save Loom videos to your device from a share link.',
    icon: Download,
    path: '/download',
    category: 'Video',
    keywords: ['loom', 'jam', 'save'],
    component: lazy(() =>
      import('@/features/downloader/components/DownloaderPage').then((m) => ({
        default: m.DownloaderPage,
      })),
    ),
  },
  {
    id: 'webm-to-mp4',
    name: 'WebM to MP4',
    description: 'Convert browser recordings to MP4 that plays everywhere.',
    icon: FileVideo,
    path: '/webm-to-mp4',
    category: 'Video',
    keywords: ['convert', 'ffmpeg', 'h264', 'transcode'],
    component: lazy(() => import('@/features/webm-to-mp4/components/WebmToMp4Page')),
  },
  {
    id: 'markdown-viewer',
    name: 'Markdown Viewer',
    description: 'Write markdown with a live preview, then export to HTML or PDF.',
    icon: FileText,
    path: '/markdown',
    category: 'Documents',
    layout: 'full',
    keywords: ['md', 'editor', 'preview', 'pdf', 'readme'],
    component: lazy(() => import('@/features/markdown/components/MarkdownPage')),
  },
]

/** Tools grouped by category, in TOOL_CATEGORIES order, skipping empty categories. */
export function toolsByCategory(tools: ToolDefinition[] = TOOLS) {
  return TOOL_CATEGORIES.map((category) => ({
    category,
    tools: tools.filter((t) => t.category === category),
  })).filter((group) => group.tools.length > 0)
}

export function findToolByPath(pathname: string, tools: ToolDefinition[] = TOOLS) {
  return tools.find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`))
}

/** "01", "02", … in display order (grouped by category), so numbering matches the home index. */
export function toolNumber(id: string, tools: ToolDefinition[] = TOOLS): string | null {
  const ordered = toolsByCategory(tools).flatMap((g) => g.tools)
  const i = ordered.findIndex((t) => t.id === id)
  return i === -1 ? null : String(i + 1).padStart(2, '0')
}
