#!/usr/bin/env node
// WCAG contrast check for the design tokens in src/styles/tokens.css.
//
// Surfaces are flat, so every text token is checked against each background it can sit on:
// --bg, --surface and --surface-2. Body text needs 4.5:1; --accent is for fills, borders, icons and
// large text, so it needs 3:1. Text placed on fills (accent, ink, danger) is checked too.
//
//   node scripts/check-contrast.mjs        # exits 1 if anything fails

import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')
const [lightSrc, darkSrc] = css.split(':root.dark')

const parse = (src) =>
  Object.fromEntries(
    [...src.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]),
  )
const themes = { light: parse(lightSrc), dark: { ...parse(lightSrc), ...parse(darkSrc) } }

const rgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
const luminance = (hex) =>
  rgb(hex)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const BACKGROUNDS = ['bg', 'surface', 'surface-2']
const TEXT = ['ink', 'muted', 'accent-text', 'danger', 'success', 'warning']
const LARGE_OR_ICON = ['accent', 'recording']
// [foreground, background, minimum] for text on fills
const ON_FILLS = [
  ['accent-ink', 'accent', 4.5], // primary button label
  ['bg', 'ink', 4.5], // selected chip / segmented label
  ['surface', 'danger', 4.5], // danger button label
]

let failures = 0
const cell = (fg, bg, min, t) => {
  const r = ratio(t[fg], t[bg])
  if (r < min) failures++
  return `${r.toFixed(2)}${r < min ? ` ✗<${min}` : ''}`
}

for (const [name, t] of Object.entries(themes)) {
  console.log(
    `\n${name.toUpperCase()}${' '.repeat(14)}${BACKGROUNDS.map((b) => b.padEnd(12)).join('')}`,
  )
  for (const fg of TEXT) {
    console.log(
      `  ${fg.padEnd(16)}${BACKGROUNDS.map((bg) => cell(fg, bg, 4.5, t).padEnd(12)).join('')}`,
    )
  }
  for (const fg of LARGE_OR_ICON) {
    console.log(
      `  ${(fg + ' (3:1)').padEnd(16)}${BACKGROUNDS.map((bg) => cell(fg, bg, 3, t).padEnd(12)).join('')}`,
    )
  }
  for (const [fg, bg, min] of ON_FILLS) {
    console.log(`  ${`${fg} on ${bg}`.padEnd(28)}${cell(fg, bg, min, t)}`)
  }
}

console.log(failures ? `\n${failures} contrast failure(s).` : '\nAll contrast checks pass.')
process.exit(failures ? 1 : 0)
