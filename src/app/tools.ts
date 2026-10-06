import { Download, FileText, FileVideo, ImageDown, Video, type LucideIcon } from 'lucide-react'
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * The tool registry. Routes, the home index, the Tools menu, the command palette and the
 * build-time SEO pages are all generated from it. Adding a tool = a toolMeta.ts entry, a UI entry
 * here, and a feature folder.
 */

import { TOOL_CATEGORIES, TOOL_META, type ToolMeta } from './toolMeta'

export { TOOL_CATEGORIES }
export type { ToolCategory } from './toolMeta'

export interface ToolDefinition extends ToolMeta {
  icon: LucideIcon
  /** Lazy so each tool's dependencies load only when its page is opened. */
  component: LazyExoticComponent<ComponentType>
}

/** The React-only half of each tool. Names, paths and copy live in toolMeta.ts. */
const UI: Record<string, Pick<ToolDefinition, 'icon' | 'component'>> = {
  'screen-recorder': {
    icon: Video,
    component: lazy(() =>
      import('@/features/recorder/components/RecorderPage').then((m) => ({
        default: m.RecorderPage,
      })),
    ),
  },
  'video-downloader': {
    icon: Download,
    component: lazy(() =>
      import('@/features/downloader/components/DownloaderPage').then((m) => ({
        default: m.DownloaderPage,
      })),
    ),
  },
  'webm-to-mp4': {
    icon: FileVideo,
    component: lazy(() => import('@/features/webm-to-mp4/components/WebmToMp4Page')),
  },
  'image-compress': {
    icon: ImageDown,
    component: lazy(() => import('@/features/image-compress/components/ImageCompressPage')),
  },
  'markdown-viewer': {
    icon: FileText,
    component: lazy(() => import('@/features/markdown/components/MarkdownPage')),
  },
}

export const TOOLS: ToolDefinition[] = TOOL_META.map((meta) => {
  const ui = UI[meta.id]
  if (!ui) throw new Error(`Tool "${meta.id}" has metadata but no UI entry in tools.ts`)
  return { ...meta, ...ui }
})

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
