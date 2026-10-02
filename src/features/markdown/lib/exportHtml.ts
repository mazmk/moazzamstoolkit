import { DARK_VARS, DOC_CSS, HIGHLIGHT_CSS, LIGHT_VARS, themeVarsCss } from './docStyles'

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface ExportInput {
  title: string
  /** Rendered, sanitized HTML of the document body. */
  bodyHtml: string
}

const SYSTEM_FONTS =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

/**
 * A fully self-contained HTML file: every style inlined, no external requests (no fonts, scripts
 * or stylesheets), responsive width, and light/dark via prefers-color-scheme.
 */
export function buildStandaloneHtml({ title, bodyHtml }: ExportInput): string {
  const css = [
    themeVarsCss(':root', { ...LIGHT_VARS, '--page-bg': '#fbfaf6' }),
    `@media (prefers-color-scheme: dark) {\n${themeVarsCss(':root', { ...DARK_VARS, '--page-bg': '#1a1917' })}\n}`,
    `*, *::before, *::after { box-sizing: border-box; }
html { color-scheme: light dark; -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--page-bg); font-family: ${SYSTEM_FONTS}; }
main { padding: clamp(24px, 6vw, 64px) clamp(16px, 5vw, 32px); }`,
    // The doc styles reference the app's mono font first; fall back to system monospace here.
    DOC_CSS,
    HIGHLIGHT_CSS,
  ].join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="generator" content="Moazzam's Toolkit — Markdown Viewer">
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
</head>
<body>
<main>
<article class="md-doc">
${bodyHtml}
</article>
</main>
</body>
</html>
`
}

/**
 * HTML for printing to PDF: white page, black text, readable code, no UI, and no page breaks inside
 * code blocks, tables or right after headings.
 */
export function buildPrintHtml({ title, bodyHtml }: ExportInput): string {
  const css = [
    themeVarsCss(':root', {
      ...LIGHT_VARS,
      '--md-text': '#000000',
      '--md-heading': '#000000',
      '--md-muted': '#333333',
      '--md-link': '#000000',
      '--md-border': '#bbbbbb',
      '--md-code-bg': '#f5f5f5',
      '--md-code-text': '#000000',
      '--md-inline-code-bg': '#eeeeee',
    }),
    `@page { margin: 18mm 16mm; }
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; background: #ffffff; color: #000000; font-family: ${SYSTEM_FONTS}; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
    DOC_CSS,
    HIGHLIGHT_CSS,
    `.md-doc { max-width: none; font-size: 11pt; }
.md-doc pre { white-space: pre-wrap; overflow: visible; border-color: #cccccc; }
.md-doc table { display: table; width: auto; overflow: visible; }
.md-doc pre, .md-doc table, .md-doc blockquote, .md-doc img, .md-doc tr { break-inside: avoid; }
.md-doc h1, .md-doc h2, .md-doc h3, .md-doc h4, .md-doc h5, .md-doc h6 { break-after: avoid; break-inside: avoid; }
.md-doc a { text-decoration: underline; }
.md-doc a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.85em; color: #333333; word-break: break-all; }`,
  ].join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
</head>
<body>
<article class="md-doc">
${bodyHtml}
</article>
</body>
</html>
`
}
