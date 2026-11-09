import { describe, expect, it } from 'vitest'
import {
  COLOR_TOKEN_LABELS,
  colorTokenLabel,
} from '@/lib/style-engine/semantic-preset-labels'

describe('Batch 10 — color token semantic labels', () => {
  it('maps theme color tokens to semantic names without CSS vars', () => {
    expect(colorTokenLabel('primary')).toBe('Primary Brand')
    expect(colorTokenLabel('surface')).toBe('Surface Card')
    expect(colorTokenLabel('text')).toBe('Main Text')
    expect(COLOR_TOKEN_LABELS.background).toBe('Background')
    expect(colorTokenLabel('primary')).not.toMatch(/--|var\(/)
  })

  it('falls back gracefully for unset / unknown tokens', () => {
    expect(colorTokenLabel(undefined)).toBe('Unset')
    expect(colorTokenLabel('customBrand')).toBe('customBrand')
  })
})
