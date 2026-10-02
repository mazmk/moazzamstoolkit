import { render } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { MarkdownPreview } from './MarkdownPreview'

function renderMarkdown(markdown: string) {
  const articleRef = createRef<HTMLElement>()
  render(
    <MarkdownPreview
      markdown={markdown}
      scrollRef={createRef()}
      articleRef={articleRef}
      onScroll={() => {}}
    />,
  )
  return articleRef.current!
}

describe('MarkdownPreview', () => {
  it('renders GFM: tables, task lists, strikethrough and autolinks', () => {
    const article = renderMarkdown(
      '| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~old~~ https://example.com',
    )
    expect(article.querySelector('table td')?.textContent).toBe('1')
    expect(article.querySelectorAll('input[type="checkbox"]')).toHaveLength(2)
    expect(article.querySelector('del')?.textContent).toBe('old')
    expect(article.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
  })

  it('opens external links in a new tab safely', () => {
    const link = renderMarkdown('[x](https://example.com)').querySelector('a')!
    expect(link.target).toBe('_blank')
    expect(link.rel).toBe('noopener noreferrer')
  })

  it('highlights fenced code by language', () => {
    const code = renderMarkdown('```js\nconst a = 1\n```').querySelector('pre code')!
    expect(code.className).toContain('language-js')
    expect(code.querySelector('.hljs-keyword')?.textContent).toBe('const')
  })

  it('tolerates unknown fence languages', () => {
    const code = renderMarkdown('```notalanguage\nhello\n```').querySelector('pre code')!
    expect(code.textContent).toBe('hello\n')
  })

  it('never lets pasted markdown run scripts', () => {
    const article = renderMarkdown(
      [
        '<script>window.pwned = true</script>',
        '<img src="x" onerror="window.pwned = true">',
        '<a href="javascript:alert(1)">click</a>',
        '[md link](javascript:alert(1))',
        '<iframe src="https://evil.example"></iframe>',
        '<div style="background:url(https://evil.example)">styled</div>',
      ].join('\n\n'),
    )
    const html = article.innerHTML
    expect(article.querySelector('script, iframe')).toBeNull()
    expect(html).not.toMatch(/onerror|javascript:|<script|style=/i)
    expect((window as { pwned?: boolean }).pwned).toBeUndefined()
  })
})
