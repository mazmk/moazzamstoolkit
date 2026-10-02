import { describe, expect, it } from 'vitest'

import { documentStats, exportBaseName, firstHeading, slugify } from './document'
import { SAMPLE_MARKDOWN } from './sample'

describe('slugify', () => {
  it('lowercases and dash-separates', () => {
    expect(slugify('Hello, World! (v2)')).toBe('hello-world-v2')
    expect(slugify('  Release   Notes  ')).toBe('release-notes')
  })

  it('strips accents and symbols', () => {
    expect(slugify('Café Déjà Vu ✨')).toBe('cafe-deja-vu')
    expect(slugify('C++ & Rust: 2026')).toBe('c-rust-2026')
  })

  it('returns an empty string when nothing is left', () => {
    expect(slugify('✨🔥')).toBe('')
  })

  it('caps length without leaving a trailing dash', () => {
    const slug = slugify('word '.repeat(40), 20)
    expect(slug.length).toBeLessThanOrEqual(20)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('firstHeading', () => {
  it('finds the first ATX H1 and strips inline formatting', () => {
    expect(firstHeading('intro\n\n# The **Big** [Plan](https://x.y) #\n\n# Second')).toBe(
      'The Big Plan',
    )
  })

  it('supports setext headings', () => {
    expect(firstHeading('My Title\n========\n\nbody')).toBe('My Title')
  })

  it('ignores H2s, and headings inside fenced code', () => {
    expect(firstHeading('## Not this\n```md\n# Nor this\n```\n# This one')).toBe('This one')
    expect(firstHeading('~~~\n# hidden\n~~~')).toBeNull()
  })

  it('returns null without an H1', () => {
    expect(firstHeading('just text\n## sub')).toBeNull()
    expect(firstHeading('#hashtag is not a heading')).toBeNull()
  })
})

describe('exportBaseName', () => {
  it('uses the slugified first H1', () => {
    expect(exportBaseName(SAMPLE_MARKDOWN)).toBe('release-notes')
  })

  it('falls back to "document"', () => {
    expect(exportBaseName('no heading here')).toBe('document')
    expect(exportBaseName('# 🎉')).toBe('document')
  })
})

describe('documentStats', () => {
  it('counts words, characters and reading time', () => {
    const stats = documentStats('# Hello world\n\nIt’s a well-known fact.')
    expect(stats.words).toBe(6)
    expect(stats.characters).toBe(38) // 13 + 2 newlines + 23
    expect(stats.readingMinutes).toBe(1)
  })

  it('does not count code blocks as reading words', () => {
    expect(documentStats('one two\n```\nconst a = b + c\n```').words).toBe(2)
  })

  it('reports zero for an empty document', () => {
    expect(documentStats('')).toEqual({ words: 0, characters: 0, readingMinutes: 0 })
  })
})
