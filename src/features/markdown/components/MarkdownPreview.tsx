import { memo, type ComponentPropsWithoutRef, type Ref } from 'react'
import ReactMarkdown, { type Options } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

import { APP_PREVIEW_CSS } from '../lib/docStyles'

// Sanitize first: pasted HTML is stripped before anything else sees it. The default schema keeps
// `language-*` classes on <code>, so highlighting still knows each block's language.
const REMARK_PLUGINS: Options['remarkPlugins'] = [remarkGfm]
const REHYPE_PLUGINS: Options['rehypePlugins'] = [
  rehypeSanitize,
  [rehypeHighlight, { detect: false }],
]

function Link({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) {
  const external = href ? /^https?:\/\//i.test(href) : false
  return (
    <a
      href={href}
      {...rest}
      // Open external links in a new tab so following one never discards the open document.
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

const COMPONENTS = { a: Link }

interface MarkdownPreviewProps {
  markdown: string
  scrollRef: Ref<HTMLDivElement>
  articleRef: Ref<HTMLElement>
  onScroll: () => void
}

/** Rendered, sanitized preview. Memoised so typing re-renders only when the (deferred) text changes. */
export const MarkdownPreview = memo(function MarkdownPreview({
  markdown,
  scrollRef,
  articleRef,
  onScroll,
}: MarkdownPreviewProps) {
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      tabIndex={0}
      aria-label="Rendered preview"
      role="region"
      className="h-full min-h-0 flex-1 overflow-y-auto p-5 sm:p-8"
    >
      <style>{APP_PREVIEW_CSS}</style>
      <article ref={articleRef} className="md-doc">
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={COMPONENTS}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  )
})
