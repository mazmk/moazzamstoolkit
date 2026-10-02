/**
 * Documentation styles for rendered markdown, shared by the live preview and the exported HTML so
 * both look the same. Everything is scoped to `.md-doc` and driven by CSS variables, so themes are
 * just variable sets.
 */

type ThemeVars = Record<string, string>

export const LIGHT_VARS: ThemeVars = {
  '--md-text': '#16140f',
  '--md-muted': '#6b665b',
  '--md-heading': '#16140f',
  '--md-link': '#bc320e',
  '--md-border': '#d9d4c6',
  '--md-quote-bar': '#e8451e',
  '--md-code-bg': '#f3f0e8',
  '--md-code-text': '#16140f',
  '--md-inline-code-bg': '#eae6da',
  '--md-table-stripe': 'rgba(22, 20, 15, 0.03)',
  '--md-mark': '#fbe3a8',
  '--md-check': '#e8451e',
  '--hl-comment': '#6b665b',
  '--hl-keyword': '#b42318',
  '--hl-string': '#2e6b30',
  '--hl-number': '#8a5300',
  '--hl-title': '#1f5a8a',
  '--hl-attr': '#9a3b12',
  '--hl-meta': '#11676b',
}

export const DARK_VARS: ThemeVars = {
  '--md-text': '#f1eee6',
  '--md-muted': '#a39d8f',
  '--md-heading': '#f1eee6',
  '--md-link': '#ff8a63',
  '--md-border': '#2e2b27',
  '--md-quote-bar': '#ff6a3d',
  '--md-code-bg': '#121110',
  '--md-code-text': '#f1eee6',
  '--md-inline-code-bg': '#24221f',
  '--md-table-stripe': 'rgba(241, 238, 230, 0.03)',
  '--md-mark': '#6b4a12',
  '--md-check': '#ff6a3d',
  '--hl-comment': '#a39d8f',
  '--hl-keyword': '#ff8f80',
  '--hl-string': '#a9cf8f',
  '--hl-number': '#e5b566',
  '--hl-title': '#8db8e0',
  '--hl-attr': '#f0a57a',
  '--hl-meta': '#7fc8c0',
}

export function themeVarsCss(selector: string, vars: ThemeVars): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
  return `${selector} {\n${body}\n}`
}

export const DOC_CSS = `
.md-doc {
  color: var(--md-text);
  font-size: 16px;
  line-height: 1.7;
  overflow-wrap: break-word;
  max-width: 72ch;
  margin-inline: auto;
}
.md-doc > :first-child { margin-top: 0; }
.md-doc > :last-child { margin-bottom: 0; }
.md-doc h1, .md-doc h2, .md-doc h3, .md-doc h4, .md-doc h5, .md-doc h6 {
  color: var(--md-heading);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.015em;
  margin: 1.8em 0 0.6em;
}
.md-doc h1 { font-size: 2em; margin-top: 0.4em; }
.md-doc h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid var(--md-border); }
.md-doc h3 { font-size: 1.25em; }
.md-doc h4 { font-size: 1.05em; }
.md-doc h5, .md-doc h6 { font-size: 0.95em; color: var(--md-muted); }
.md-doc p, .md-doc ul, .md-doc ol, .md-doc blockquote, .md-doc pre, .md-doc table, .md-doc dl { margin: 0 0 1.1em; }
.md-doc a { color: var(--md-link); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
.md-doc a:hover { text-decoration-thickness: 2px; }
.md-doc strong { font-weight: 600; color: var(--md-heading); }
.md-doc del { color: var(--md-muted); }
.md-doc mark { background: var(--md-mark); color: inherit; padding: 0 0.15em; border-radius: 3px; }
.md-doc ul, .md-doc ol { padding-left: 1.6em; }
.md-doc ul { list-style: disc; }
.md-doc ol { list-style: decimal; }
.md-doc ul ul { list-style: circle; }
.md-doc li { margin: 0.25em 0; }
.md-doc li > ul, .md-doc li > ol { margin: 0.25em 0 0; }
.md-doc li::marker { color: var(--md-muted); }
.md-doc .contains-task-list { list-style: none; padding-left: 0.25em; }
.md-doc .task-list-item { display: flex; align-items: baseline; gap: 0.55em; }
.md-doc .task-list-item input { margin: 0; translate: 0 0.12em; accent-color: var(--md-check); }
.md-doc blockquote {
  padding: 0.2em 1em;
  color: var(--md-muted);
  border-left: 3px solid var(--md-quote-bar);
}
.md-doc hr { border: 0; border-top: 1px solid var(--md-border); margin: 2em 0; }
.md-doc img { max-width: 100%; border-radius: 8px; }
.md-doc code, .md-doc kbd, .md-doc pre {
  font-family: 'JetBrains Mono Variable', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
}
.md-doc :not(pre) > code {
  font-size: 0.875em;
  padding: 0.15em 0.4em;
  border-radius: 6px;
  background: var(--md-inline-code-bg);
}
.md-doc pre {
  padding: 1em 1.15em;
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid var(--md-border);
  background: var(--md-code-bg);
  color: var(--md-code-text);
  font-size: 0.85em;
  line-height: 1.6;
}
.md-doc pre code { background: none; padding: 0; font-size: inherit; }
.md-doc table {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  font-size: 0.95em;
}
.md-doc th, .md-doc td { padding: 0.5em 0.9em; border: 1px solid var(--md-border); text-align: left; }
.md-doc th { font-weight: 600; color: var(--md-heading); }
.md-doc tbody tr:nth-child(even) { background: var(--md-table-stripe); }
.md-doc [align="center"] { text-align: center; }
.md-doc [align="right"] { text-align: right; }
.md-doc .footnotes { font-size: 0.9em; color: var(--md-muted); }
`

export const HIGHLIGHT_CSS = `
.md-doc .hljs-comment, .md-doc .hljs-quote { color: var(--hl-comment); font-style: italic; }
.md-doc .hljs-keyword, .md-doc .hljs-selector-tag, .md-doc .hljs-built_in, .md-doc .hljs-type, .md-doc .hljs-literal { color: var(--hl-keyword); }
.md-doc .hljs-string, .md-doc .hljs-regexp, .md-doc .hljs-addition, .md-doc .hljs-template-variable { color: var(--hl-string); }
.md-doc .hljs-number, .md-doc .hljs-symbol, .md-doc .hljs-bullet { color: var(--hl-number); }
.md-doc .hljs-title, .md-doc .hljs-section, .md-doc .hljs-function .hljs-title { color: var(--hl-title); }
.md-doc .hljs-attr, .md-doc .hljs-attribute, .md-doc .hljs-variable, .md-doc .hljs-property, .md-doc .hljs-deletion { color: var(--hl-attr); }
.md-doc .hljs-meta, .md-doc .hljs-tag, .md-doc .hljs-name, .md-doc .hljs-selector-class { color: var(--hl-meta); }
.md-doc .hljs-emphasis { font-style: italic; }
.md-doc .hljs-strong { font-weight: 600; }
`

/** Styles for the in-app preview: themes follow the app's `.dark` class. */
export const APP_PREVIEW_CSS = [
  themeVarsCss('.md-doc', LIGHT_VARS),
  themeVarsCss('.dark .md-doc', DARK_VARS),
  DOC_CSS,
  HIGHLIGHT_CSS,
].join('\n')
