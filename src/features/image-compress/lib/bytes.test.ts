import { describe, expect, it } from 'vitest'

import { formatBytes, formatSavings, savingsPercent, targetBytes } from './bytes'

describe('formatBytes', () => {
  it('uses B, KB, MB and GB with at most three significant figures', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(980)).toBe('980 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(512 * 1024)).toBe('512 KB')
    expect(formatBytes(86.4 * 1024 * 1024)).toBe('86.4 MB')
    expect(formatBytes(1.25 * 1024 ** 3)).toBe('1.25 GB')
  })

  it('rolls over instead of printing 1024.0 KB', () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe('1.0 MB')
  })

  it('treats invalid input as zero', () => {
    expect(formatBytes(-5)).toBe('0 B')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })
})

describe('savingsPercent', () => {
  it('rounds the saved share of the original', () => {
    expect(savingsPercent(1000, 250)).toBe(75)
    expect(savingsPercent(86.4, 21.2)).toBe(75)
    expect(savingsPercent(1000, 1000)).toBe(0)
  })

  it('is negative when the output grew, and 0 for an empty original', () => {
    expect(savingsPercent(1000, 1040)).toBe(-4)
    expect(savingsPercent(0, 10)).toBe(0)
    expect(Object.is(savingsPercent(1000, 1001), 0)).toBe(true)
  })

  it('formats as words', () => {
    expect(formatSavings(1000, 250)).toBe('saved 75%')
    expect(formatSavings(1000, 1040)).toBe('4% larger')
    expect(formatSavings(1000, 1000)).toBe('no change')
  })
})

describe('targetBytes', () => {
  it('converts KB and MB, rejecting non-positive values', () => {
    expect(targetBytes(500, 'KB')).toBe(512_000)
    expect(targetBytes(1.5, 'MB')).toBe(1_572_864)
    expect(targetBytes(0, 'KB')).toBeNull()
    expect(targetBytes(Number.NaN, 'MB')).toBeNull()
  })
})
