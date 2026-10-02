import { describe, expect, it } from 'vitest'

import { filterEntries } from './CommandPalette'
import { TOOL_CATEGORIES, TOOLS, findToolByPath, toolNumber, toolsByCategory } from './tools'

describe('tool registry', () => {
  it('has unique ids and paths', () => {
    const ids = TOOLS.map((t) => t.id)
    const paths = TOOLS.map((t) => t.path)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('uses absolute, kebab-case paths that never shadow home', () => {
    for (const tool of TOOLS) {
      expect(tool.path).toMatch(/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(tool.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('only uses known categories, and groups keep category order', () => {
    for (const tool of TOOLS) expect(TOOL_CATEGORIES).toContain(tool.category)
    const order = toolsByCategory().map((g) => g.category)
    expect(order).toEqual(TOOL_CATEGORIES.filter((c) => order.includes(c)))
    expect(toolsByCategory().flatMap((g) => g.tools)).toHaveLength(TOOLS.length)
  })

  it('registers the four tools', () => {
    expect(TOOLS.map((t) => t.path).sort()).toEqual(
      ['/download', '/markdown', '/record', '/webm-to-mp4'].sort(),
    )
  })

  it('finds a tool by its path or a nested path', () => {
    expect(findToolByPath('/markdown')?.id).toBe('markdown-viewer')
    expect(findToolByPath('/record/anything')?.id).toBe('screen-recorder')
    expect(findToolByPath('/recorder')).toBeUndefined()
    expect(findToolByPath('/')).toBeUndefined()
  })
})

describe('toolNumber', () => {
  it('numbers tools 01.. in display (category) order', () => {
    const ordered = toolsByCategory().flatMap((g) => g.tools)
    expect(ordered.map((t) => toolNumber(t.id))).toEqual(
      ordered.map((_, i) => String(i + 1).padStart(2, '0')),
    )
    expect(toolNumber('nope')).toBeNull()
  })
})

describe('command palette filtering', () => {
  const entries = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    category: t.category,
    keywords: t.keywords ?? [],
  }))

  it('matches on name, category and keywords, all terms required', () => {
    expect(filterEntries(entries, 'webm').map((e) => e.name)).toEqual(['WebM to MP4'])
    expect(filterEntries(entries, 'documents').map((e) => e.name)).toEqual(['Markdown Viewer'])
    expect(filterEntries(entries, 'ffmpeg').map((e) => e.name)).toEqual(['WebM to MP4'])
    expect(filterEntries(entries, 'video loom').map((e) => e.name)).toEqual([
      'Screen Recorder',
      'Video Downloader',
    ])
    expect(filterEntries(entries, '   ')).toHaveLength(entries.length)
    expect(filterEntries(entries, 'zzz')).toHaveLength(0)
  })
})

describe('canonicalFor', () => {
  const root = 'https://mazmk.github.io/screennest/'

  it('moves between home and tool pages without eating the base path', async () => {
    const { canonicalFor } = await import('./Layout')
    expect(canonicalFor(root, '/markdown')).toBe(`${root}markdown/`)
    expect(canonicalFor(`${root}markdown/`)).toBe(root)
    expect(canonicalFor(`${root}markdown/`, '/record')).toBe(`${root}record/`)
    expect(canonicalFor(root)).toBe(root)
  })
})
