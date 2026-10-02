import { describe, expect, it } from 'vitest'

import { parseVideoUrl } from './providers'

const LOOM_ID = 'ae4bdcb7209f4769b5e5e43194a2b76d'
const JAM_ID = '657c97b6-6d5c-4194-b96d-b4ab4e886a49'

describe('parseVideoUrl', () => {
  it.each([
    `https://www.loom.com/share/${LOOM_ID}`,
    `https://loom.com/share/${LOOM_ID}?sid=abc`,
    `https://www.loom.com/embed/${LOOM_ID}`,
    `https://www.loom.com/share/My-Demo-Video-${LOOM_ID}`,
    `  https://www.loom.com/share/${LOOM_ID.toUpperCase()}/  `,
  ])('recognises Loom link %s', (url) => {
    expect(parseVideoUrl(url)).toEqual({ provider: 'loom', id: LOOM_ID })
  })

  it('recognises Jam links', () => {
    expect(parseVideoUrl(`https://jam.dev/c/${JAM_ID}`)).toEqual({ provider: 'jam', id: JAM_ID })
  })

  it.each([
    'not a url',
    'ftp://www.loom.com/share/' + LOOM_ID,
    'https://www.loom.com/share/too-short',
    `https://evil-loom.com/share/${LOOM_ID}`,
    `https://jam.dev/settings/${JAM_ID}`,
    'https://youtube.com/watch?v=123',
  ])('rejects %s', (url) => {
    expect(parseVideoUrl(url)).toBeNull()
  })
})
