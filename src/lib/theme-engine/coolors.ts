import { calculateContrastRatio, getRelativeLuminance, parseColorToRgb } from './presets'
import type { ThemeTokens } from './types'

export interface ParsedCoolorsCsvResult {
  success: boolean
  colors?: string[]
  error?: string
}

export interface MappedCoolorsPalette {
  colors: ThemeTokens['colors']
  contrastRatio: number
  isReadable: boolean
  warning?: string
  roles: {
    text: string
    background: string
    primary: string
    accent: string
    surface: string
  }
}

/**
 * Parses comma-separated Coolors CSV export.
 * Accepts hex colors with or without '#' prefix.
 * e.g. "93827f,f3f9d2,bdc4a7,2f2f2f,92b4a7" or "#93827f, #f3f9d2, ..."
 */
export function parseCoolorsCsv(input: string): ParsedCoolorsCsvResult {
  if (!input || typeof input !== 'string') {
    return { success: false, error: 'Input must be a non-empty string.' }
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return { success: false, error: 'Please enter comma-separated HEX colors.' }
  }

  // Split by comma
  const rawParts = trimmed.split(',').map((p) => p.trim()).filter(Boolean)

  if (rawParts.length !== 5) {
    return {
      success: false,
      error: `Expected exactly 5 comma-separated colors, found ${rawParts.length}.`,
    }
  }

  const normalized: string[] = []
  for (const part of rawParts) {
    const cleanHex = part.replace(/^#/, '').trim()
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleanHex)) {
      return {
        success: false,
        error: `Invalid HEX color "${part}". Colors must be 3 or 6 hexadecimal characters.`,
      }
    }
    const fullHex = cleanHex.length === 3
      ? cleanHex.split('').map((c) => c + c).join('')
      : cleanHex
    normalized.push(`#${fullHex.toLowerCase()}`)
  }

  return { success: true, colors: normalized }
}

/**
 * Deterministically maps 5 raw palette colors into Zyvavu semantic roles.
 * Prioritizes WCAG AA (4.5:1) text vs background contrast.
 */
export function mapCoolorsPalette(
  fiveColors: string[],
  existingTokens?: ThemeTokens,
): MappedCoolorsPalette {
  if (fiveColors.length !== 5) {
    throw new Error('mapCoolorsPalette requires an array of 5 color strings.')
  }

  // 1. Evaluate all 10 possible pairs to find the maximum contrast pair for text/background
  let bestPair = { fgIdx: 0, bgIdx: 1, ratio: 0, isReadable: false, warning: '' }

  for (let i = 0; i < fiveColors.length; i++) {
    for (let j = i + 1; j < fiveColors.length; j++) {
      const c1 = fiveColors[i]
      const c2 = fiveColors[j]
      const rgb1 = parseColorToRgb(c1)
      const rgb2 = parseColorToRgb(c2)
      if (!rgb1 || !rgb2) continue

      const lum1 = getRelativeLuminance(rgb1)
      const lum2 = getRelativeLuminance(rgb2)

      // Darker color as text, lighter as background
      const [textCandidate, bgCandidate, textIdx, bgIdx] =
        lum1 <= lum2 ? [c1, c2, i, j] : [c2, c1, j, i]

      const { ratio, isReadable, warning } = calculateContrastRatio(textCandidate, bgCandidate)

      if (ratio > bestPair.ratio) {
        bestPair = {
          fgIdx: textIdx,
          bgIdx: bgIdx,
          ratio,
          isReadable,
          warning: warning || '',
        }
      }
    }
  }

  const textColor = fiveColors[bestPair.fgIdx]
  const bgColor = fiveColors[bestPair.bgIdx]

  // Remaining 3 indices
  const remainingIndices = [0, 1, 2, 3, 4].filter(
    (idx) => idx !== bestPair.fgIdx && idx !== bestPair.bgIdx,
  )

  // Rank remaining colors by contrast against background
  const scoredRemaining = remainingIndices.map((idx) => {
    const col = fiveColors[idx]
    const { ratio } = calculateContrastRatio(col, bgColor)
    return { idx, col, ratio }
  })

  // Sort descending by contrast against background
  scoredRemaining.sort((a, b) => b.ratio - a.ratio)

  // Highest contrast against background becomes Primary Brand
  const primaryColor = scoredRemaining[0].col
  // Next becomes Accent Highlight
  const accentColor = scoredRemaining[1].col
  // Remaining becomes Surface
  const surfaceColor = scoredRemaining[2].col

  const finalColors: ThemeTokens['colors'] = {
    text: textColor,
    background: bgColor,
    primary: primaryColor,
    accent: accentColor,
    surface: surfaceColor,
    primaryHover: primaryColor,
    textMuted: textColor,
    border: surfaceColor,
    shadowSoft: existingTokens?.colors?.shadowSoft || '#e6eceb',
    shadowMedium: existingTokens?.colors?.shadowMedium || '#bfd0cd',
    shadowStrong: existingTokens?.colors?.shadowStrong || '#7a9692',
  }

  return {
    colors: finalColors,
    contrastRatio: bestPair.ratio,
    isReadable: bestPair.isReadable,
    warning: bestPair.warning || undefined,
    roles: {
      text: textColor,
      background: bgColor,
      primary: primaryColor,
      accent: accentColor,
      surface: surfaceColor,
    },
  }
}
