import { describe, expect, it } from 'vitest'

import {
  BUILTIN_COLOR_PRESETS,
  BUILTIN_TYPOGRAPHY_PRESETS,
  calculateContrastRatio,
  parseColorToRgb,
  validateColorString,
  validateThemeTokens,
} from '@/lib/theme-engine/presets'
import {
  CURATED_FONTS,
  SYSTEM_FONTS,
  extractPrimaryFontFamily,
  getGoogleFontUrl,
  isSystemOrGenericFont,
} from '@/lib/theme-engine/fonts'
import {
  generateThemeCss,
  getActiveThemeConfig,
  mergeThemeConfig,
} from '@/lib/theme-engine/styles'
import type { ThemeConfig, ThemeTokens } from '@/lib/theme-engine/types'

describe('Theme Style Customizer — Preset System', () => {
  it('provides coordinated built-in color presets with valid colors', () => {
    expect(BUILTIN_COLOR_PRESETS.length).toBeGreaterThanOrEqual(6)

    for (const preset of BUILTIN_COLOR_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.name).toBeTruthy()
      expect(preset.colors.primary).toBeTruthy()
      expect(preset.colors.background).toBeTruthy()
      expect(preset.colors.text).toBeTruthy()

      // Every color value must pass strict validation
      for (const [key, val] of Object.entries(preset.colors)) {
        if (val) {
          expect(validateColorString(val)).toBe(true)
        }
      }
    }
  })

  it('provides coordinated built-in typography presets with valid heading/body pairings', () => {
    expect(BUILTIN_TYPOGRAPHY_PRESETS.length).toBeGreaterThanOrEqual(5)

    for (const preset of BUILTIN_TYPOGRAPHY_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.name).toBeTruthy()
      expect(preset.typography.fontFamily).toBeTruthy()
      expect(preset.typography.fontFamilyHeading).toBeTruthy()
      expect(preset.typography.h1?.size).toBeTruthy()
      expect(preset.typography.baseFontSize).toBeTruthy()
    }
  })

  it('allows Color and Typography presets to work independently', () => {
    const baseConfig = getActiveThemeConfig()
    const initialTypo = { ...baseConfig.tokens.typography }
    const initialColors = { ...baseConfig.tokens.colors }

    // Apply color preset only
    const midnight = BUILTIN_COLOR_PRESETS.find((p) => p.id === 'midnight-indigo')!
    const withMidnightColors = mergeThemeConfig(baseConfig, {
      tokens: {
        ...baseConfig.tokens,
        colors: { ...baseConfig.tokens.colors, ...midnight.colors },
      },
    })

    expect(withMidnightColors.tokens.colors.primary).toBe(midnight.colors.primary)
    expect(withMidnightColors.tokens.colors.background).toBe(midnight.colors.background)
    // Typography remains completely untouched
    expect(withMidnightColors.tokens.typography.fontFamily).toBe(initialTypo.fontFamily)

    // Apply typography preset only on top of midnight colors
    const editorial = BUILTIN_TYPOGRAPHY_PRESETS.find((p) => p.id === 'editorial-elegance')!
    const withEditorialTypo = mergeThemeConfig(withMidnightColors, {
      tokens: {
        ...withMidnightColors.tokens,
        typography: { ...withMidnightColors.tokens.typography, ...editorial.typography },
      },
    })

    // Colors remain midnight
    expect(withEditorialTypo.tokens.colors.primary).toBe(midnight.colors.primary)
    // Typography is now editorial
    expect(withEditorialTypo.tokens.typography.fontFamilyHeading).toBe(editorial.typography.fontFamilyHeading)
  })
})

describe('Theme Style Customizer — Color Contrast & Accessibility Checker', () => {
  it('correctly calculates high contrast combinations (WCAG AA Pass)', () => {
    // Pure black text on pure white background
    const result = calculateContrastRatio('#000000', '#ffffff')
    expect(result.ratio).toBe(21)
    expect(result.isReadable).toBe(true)
    expect(result.warning).toBeUndefined()

    // Default dark text on white
    const defaultContrast = calculateContrastRatio('#17201f', '#ffffff')
    expect(defaultContrast.ratio).toBeGreaterThan(10)
    expect(defaultContrast.isReadable).toBe(true)
  })

  it('detects low contrast combinations and outputs warning threshold (< 4.5:1)', () => {
    // Light gray text on white background
    const lowContrast = calculateContrastRatio('#9ca3af', '#ffffff')
    expect(lowContrast.ratio).toBeLessThan(4.5)
    expect(lowContrast.isReadable).toBe(false)
    expect(lowContrast.warning).toBeDefined()
    expect(lowContrast.warning).toContain('Low contrast')

    // Yellow text on white background
    const yellowOnWhite = calculateContrastRatio('#fbbf24', '#ffffff')
    expect(yellowOnWhite.isReadable).toBe(false)
    expect(yellowOnWhite.warning).toContain('4.5:1')
  })

  it('handles invalid or non-hex colors gracefully without throwing', () => {
    const fallback = calculateContrastRatio('not-a-color', 'transparent')
    expect(fallback.ratio).toBe(1)
    expect(fallback.isReadable).toBe(true)
  })
})

describe('Theme Style Customizer — Security & Token Validation', () => {
  it('validates legitimate color strings (hex, rgb, hsl)', () => {
    expect(validateColorString('#fff')).toBe(true)
    expect(validateColorString('#ffffff')).toBe(true)
    expect(validateColorString('#0e6b66')).toBe(true)
    expect(validateColorString('rgb(14, 107, 102)')).toBe(true)
    expect(validateColorString('hsl(177, 77%, 24%)')).toBe(true)
    expect(validateColorString('transparent')).toBe(true)
  })

  it('rejects unsafe strings, script tags, and CSS injection attempts', () => {
    expect(validateColorString('<script>alert(1)</script>')).toBe(false)
    expect(validateColorString('url(javascript:alert(1))')).toBe(false)
    expect(validateColorString('red; background: black;')).toBe(false)
    expect(validateColorString('#123; border: 1px solid red;')).toBe(false)
  })

  it('strictly validates complete ThemeTokens payload', () => {
    const validTokens: ThemeTokens = {
      colors: {
        primary: '#0e6b66',
        background: '#ffffff',
        surface: '#f8faf9',
        text: '#17201f',
        border: '#dfe5e2',
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontFamilyHeading: 'Playfair Display, serif',
        baseFontSize: '18px',
        baseLineHeight: '1.75',
        h1: { size: '44px', lineHeight: '1.2', weight: '700' },
      },
      spacing: { md: '16px' },
      layout: { containerWidth: '1200px' },
      radius: { md: '8px' },
    }

    const res = validateThemeTokens(validTokens)
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])

    // Injects malicious font family
    const invalidTokens = {
      ...validTokens,
      typography: {
        ...validTokens.typography,
        fontFamily: 'Inter</style><script>alert(1)</script>',
      },
    }
    const invalidRes = validateThemeTokens(invalidTokens)
    expect(invalidRes.valid).toBe(false)
    expect(invalidRes.errors.length).toBeGreaterThan(0)
  })
})

describe('Theme Style Customizer — Google Fonts & Dynamic Discovery', () => {
  it('generates optimized Google Fonts URL with font-display: swap', () => {
    const url = getGoogleFontUrl(['Inter', 'Playfair Display'])
    expect(url).toBeDefined()
    expect(url).toContain('https://fonts.googleapis.com/css2?')
    expect(url).toContain('family=Inter')
    expect(url).toContain('family=Playfair%20Display')
    expect(url).toContain('display=swap')
  })

  it('returns null and makes zero external requests for system fonts', () => {
    const url = getGoogleFontUrl([
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      'Georgia, serif',
    ])
    expect(url).toBeNull()
  })

  it('extracts primary font family safely from font-family stack', () => {
    expect(extractPrimaryFontFamily("'Playfair Display', Georgia, serif")).toBe('Playfair Display')
    expect(extractPrimaryFontFamily('Inter, sans-serif')).toBe('Inter')
    expect(extractPrimaryFontFamily('"Plus Jakarta Sans", sans-serif')).toBe('Plus Jakarta Sans')
  })

  it('accurately identifies system and generic fonts', () => {
    expect(isSystemOrGenericFont('system-ui')).toBe(true)
    expect(isSystemOrGenericFont('sans-serif')).toBe(true)
    expect(isSystemOrGenericFont('Georgia')).toBe(true)
    expect(isSystemOrGenericFont('Inter')).toBe(false)
    expect(isSystemOrGenericFont('Playfair Display')).toBe(false)
  })
})

describe('Theme Style Customizer — CSS Generation & Live Preview Sync', () => {
  it('compiles updated colors and typography styles into live CSS variables and rules', () => {
    const customConfig: ThemeConfig = {
      name: 'draft-test',
      version: 1,
      tokens: {
        colors: {
          primary: '#be123c',
          background: '#fffbfb',
          surface: '#fff1f2',
          text: '#1c1917',
          border: '#fecdd3',
        },
        typography: {
          fontFamily: 'Lora, serif',
          fontFamilyHeading: 'Playfair Display, serif',
          baseFontSize: '20px',
          baseLineHeight: '1.8',
          h1: { size: '52px', lineHeight: '1.15', weight: '800', letterSpacing: '-0.02em' },
        },
        spacing: { md: '16px' },
        layout: { containerWidth: '1280px' },
        radius: { md: '8px' },
      },
    }

    const css = generateThemeCss(customConfig)

    // Checks CSS variables
    expect(css).toContain('--zyvavu-theme-primary: #be123c;')
    expect(css).toContain('--zyvavu-theme-background: #fffbfb;')
    expect(css).toContain('--zyvavu-theme-font: Lora, serif;')
    expect(css).toContain('--zyvavu-theme-font-heading: Playfair Display, serif;')
    expect(css).toContain('--zyvavu-theme-h1-size: 52px;')
    expect(css).toContain('--zyvavu-theme-h1-weight: 800;')

    // Checks element rules
    expect(css).toContain('font-family: var(--zyvavu-theme-font, system-ui, -apple-system, sans-serif);')
    expect(css).toContain('font-family: var(--zyvavu-theme-font-heading, var(--zyvavu-theme-font, inherit));')
    expect(css).toContain('font-size: var(--zyvavu-theme-h1-size, 44px);')

    // Verifies sanitization (no HTML/script tags)
    expect(css).not.toContain('<script')
    expect(css).not.toContain('</style')
  })
})
