import { describe, expect, it } from 'vitest'

import { buildPrintHtml, buildStandaloneHtml, escapeHtml } from './exportHtml'

const body = '<h1>Notes</h1><pre><code class="hljs language-ts">const a = 1</code></pre>'

/** Anything that would make the browser fetch another resource. */
const EXTERNAL_RESOURCE = /<(?:link|script|img|iframe)\b|@import|url\(\s*['"]?(?:https?:)?\/\//i

describe('buildStandaloneHtml', () => {
  const html = buildStandaloneHtml({ title: 'Q3 <Plan> & "Notes"', bodyHtml: body })

  it('is a complete document with the body inside the article', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<meta name="viewport"')
    expect(html).toContain(`<article class="md-doc">\n${body}\n</article>`)
  })

  it('escapes the title', () => {
    expect(html).toContain('<title>Q3 &lt;Plan&gt; &amp; &quot;Notes&quot;</title>')
  })

  it('inlines all CSS and makes no external requests', () => {
    expect(html).toContain('<style>')
    expect(html).not.toMatch(EXTERNAL_RESOURCE)
  })

  it('supports light and dark via prefers-color-scheme', () => {
    expect(html).toContain('@media (prefers-color-scheme: dark)')
    expect(html).toContain('color-scheme: light dark')
  })

  it('includes code highlighting styles and a responsive width', () => {
    expect(html).toContain('.hljs-keyword')
    expect(html).toContain('max-width: 72ch')
    expect(html).toContain('clamp(')
  })
})

describe('buildPrintHtml', () => {
  const html = buildPrintHtml({ title: 'notes', bodyHtml: body })

  it('prints black on white without UI', () => {
    expect(html).toContain('background: #ffffff')
    expect(html).toContain('--md-text: #000000')
    expect(html).not.toMatch(EXTERNAL_RESOURCE)
    expect(html).not.toContain('<button')
  })

  it('avoids page breaks inside code, tables and after headings', () => {
    expect(html).toMatch(/\.md-doc pre, \.md-doc table[^{]*\{ break-inside: avoid; \}/)
    expect(html).toMatch(/\.md-doc h1[^{]*\{ break-after: avoid;/)
  })

  it('wraps long code lines instead of cutting them off', () => {
    expect(html).toContain('white-space: pre-wrap')
  })
})

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    )
  })
})
