import { exportBaseName, firstHeading } from './document'
import { buildPrintHtml, buildStandaloneHtml } from './exportHtml'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const titleOf = (markdown: string) => firstHeading(markdown) ?? 'Document'

export function exportMarkdown(markdown: string) {
  downloadBlob(
    new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
    `${exportBaseName(markdown)}.md`,
  )
}

export function exportHtml(markdown: string, bodyHtml: string) {
  const html = buildStandaloneHtml({ title: titleOf(markdown), bodyHtml })
  downloadBlob(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
    `${exportBaseName(markdown)}.html`,
  )
}

export async function copyHtml(bodyHtml: string) {
  // Rich clipboard where supported, so pasting into docs/email keeps formatting.
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([bodyHtml], { type: 'text/html' }),
        'text/plain': new Blob([bodyHtml], { type: 'text/plain' }),
      }),
    ])
    return
  }
  await navigator.clipboard.writeText(bodyHtml)
}

/**
 * Prints the document from a hidden iframe so the app's UI never appears in the PDF. The user picks
 * "Save as PDF" in the browser's print dialog. The iframe's title becomes the suggested filename.
 */
export function printAsPdf(markdown: string, bodyHtml: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.tabIndex = -1
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
      visibility: 'hidden',
    })
    const cleanup = () => setTimeout(() => iframe.remove(), 1000)
    iframe.onload = () => {
      const win = iframe.contentWindow
      if (!win) {
        cleanup()
        reject(new Error('Printing is not available'))
        return
      }
      win.addEventListener('afterprint', cleanup, { once: true })
      win.focus()
      win.print()
      resolve()
    }
    iframe.srcdoc = buildPrintHtml({ title: exportBaseName(markdown), bodyHtml })
    document.body.appendChild(iframe)
  })
}
