import { describe, expect, it } from 'vitest'

import {
  BUILTIN_COLOR_PRESETS,
  BUILTIN_TYPOGRAPHY_PRESETS,
  calculateContrastRatio,
  calculateShadowColor,
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
  normalizeCustomColorPreset,
  normalizeCustomPresetsStore,
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

  it('normalizes legacy flat custom presets and skips malformed records without crashing', () => {
    const legacyFlatPreset = {
      id: 'test-preset-1',
      name: 'Custom Test Palette',
      primary: '#112233',
      secondary: '#445566',
      surface: '#ffffff',
      background: '#f8f9fa',
      text: '#111827',
    }

    const normalizedLegacy = normalizeCustomColorPreset(legacyFlatPreset)
    expect(normalizedLegacy).not.toBeNull()
    expect(normalizedLegacy?.colors.primary).toBe('#112233')
    expect(normalizedLegacy?.colors.accent).toBe('#445566')
    expect(normalizedLegacy?.colors.background).toBe('#f8f9fa')
    expect(normalizedLegacy?.colors.text).toBe('#111827')

    // Malformed / incomplete preset returns null instead of crashing or inventing colors
    expect(normalizeCustomColorPreset({ id: 'broken', name: 'Broken' })).toBeNull()
    expect(normalizeCustomColorPreset(null)).toBeNull()

    const store = normalizeCustomPresetsStore({
      colors: [
        legacyFlatPreset,
        { id: 'broken', name: 'Broken' },
        {
          id: 'valid-nested',
          name: 'Valid Nested',
          colors: {
            primary: '#0e6b66',
            background: '#ffffff',
            surface: '#f8faf9',
            text: '#17201f',
            border: '#dfe5e2',
          },
        },
      ],
      typography: [{ id: 'bad-typo', name: 'Missing Typography' }],
    })

    expect(store.colors).toHaveLength(2)
    expect(store.colors[0].colors.primary).toBe('#112233')
    expect(store.colors[1].colors.primary).toBe('#0e6b66')
    expect(store.typography).toHaveLength(0)
  })

  it('returns 1:1 contrast ratio and warning when text and background colors are identical', () => {
    const identical = calculateContrastRatio('#2563eb', '#2563eb')
    expect(identical.ratio).toBe(1)
    expect(identical.isReadable).toBe(false)
    expect(identical.warning).toBeDefined()
    expect(identical.warning).toContain('1:1')
  })
})

describe('Theme Style Customizer — Coolors CSV Import & Mapping Engine', () => {
  it('parses valid 5-color CSV strings with or without hash prefixes and extra spaces', async () => {
    const { parseCoolorsCsv } = await import('@/lib/theme-engine/coolors')

    // Standard Coolors CSV format: 93827f,f3f9d2,bdc4a7,2f2f2f,92b4a7
    const result1 = parseCoolorsCsv('93827f,f3f9d2,bdc4a7,2f2f2f,92b4a7')
    expect(result1.success).toBe(true)
    expect(result1.colors).toEqual(['#93827f', '#f3f9d2', '#bdc4a7', '#2f2f2f', '#92b4a7'])

    // With '#' prefixes and variable whitespace
    const result2 = parseCoolorsCsv(' #93827f, #f3f9d2 ,  #bdc4a7, #2f2f2f , #92b4a7 ')
    expect(result2.success).toBe(true)
    expect(result2.colors).toEqual(['#93827f', '#f3f9d2', '#bdc4a7', '#2f2f2f', '#92b4a7'])

    // 3-digit hex values expanded correctly
    const result3 = parseCoolorsCsv('fff,000,abc,123,fed')
    expect(result3.success).toBe(true)
    expect(result3.colors).toEqual(['#ffffff', '#000000', '#aabbcc', '#112233', '#ffeedd'])
  })

  it('rejects malformed CSV inputs gracefully without crashing', async () => {
    const { parseCoolorsCsv } = await import('@/lib/theme-engine/coolors')

    // Empty or non-string
    expect(parseCoolorsCsv('').success).toBe(false)
    expect(parseCoolorsCsv('   ').success).toBe(false)

    // Incorrect count (< 5 or > 5)
    expect(parseCoolorsCsv('112233,445566,778899').success).toBe(false)
    expect(parseCoolorsCsv('112233,445566,778899,aabbcc,ddeeff,001122').success).toBe(false)

    // Malformed hex characters
    const malformed = parseCoolorsCsv('93827f,f3f9d2,nothex,2f2f2f,92b4a7')
    expect(malformed.success).toBe(false)
    expect(malformed.error).toContain('Invalid HEX color')
  })

  it('deterministically maps 5 colors prioritizing highest contrast for text and background', async () => {
    const { mapCoolorsPalette } = await import('@/lib/theme-engine/coolors')

    // Input palette with dark (#2f2f2f) and light (#f3f9d2)
    const fiveColors = ['#93827f', '#f3f9d2', '#bdc4a7', '#2f2f2f', '#92b4a7']
    const existingTokens = {
      colors: {
        shadowSoft: '#custom-soft',
        shadowMedium: '#custom-medium',
        shadowStrong: '#custom-strong',
      },
    } as any

    const mapped = mapCoolorsPalette(fiveColors, existingTokens)

    // Text and background must be the highest contrast pair
    expect(mapped.colors.text).toBe('#2f2f2f')
    expect(mapped.colors.background).toBe('#f3f9d2')
    expect(mapped.isReadable).toBe(true)
    expect(mapped.contrastRatio).toBeGreaterThanOrEqual(4.5)

    // Primary and accent should be mapped from the remaining colors
    expect(mapped.colors.primary).toBeTruthy()
    expect(mapped.colors.accent).toBeTruthy()
    expect(mapped.colors.surface).toBeTruthy()

    // Existing shadow tokens must be preserved
    expect(mapped.colors.shadowSoft).toBe('#custom-soft')
    expect(mapped.colors.shadowMedium).toBe('#custom-medium')
    expect(mapped.colors.shadowStrong).toBe('#custom-strong')
  })

  it('detects low contrast combinations across all 10 pairs and sets isReadable=false', async () => {
    const { mapCoolorsPalette } = await import('@/lib/theme-engine/coolors')

    // 5 very light pastel colors where no pair achieves 4.5:1
    const pastelPalette = ['#ffffff', '#fef3c7', '#fde68a', '#fef9c3', '#fef08a']
    const mapped = mapCoolorsPalette(pastelPalette)

    expect(mapped.isReadable).toBe(false)
    expect(mapped.contrastRatio).toBeLessThan(4.5)
    expect(mapped.warning).toBeDefined()
  })
})

describe('Theme Style Customizer — Wix Typography & Vietnamese Font Support', () => {
  it('identifies fonts with verified Vietnamese character and diacritic support', async () => {
    const { hasVietnameseSupport } = await import('@/lib/theme-engine/fonts')

    // Verified fonts
    expect(hasVietnameseSupport('Inter')).toBe(true)
    expect(hasVietnameseSupport('Roboto')).toBe(true)
    expect(hasVietnameseSupport('Montserrat')).toBe(true)
    expect(hasVietnameseSupport('Lora')).toBe(true)
    expect(hasVietnameseSupport('Plus Jakarta Sans')).toBe(true)
    expect(hasVietnameseSupport('System UI')).toBe(true)

    // Unverified or decorative fonts
    expect(hasVietnameseSupport('Cinzel')).toBe(false)
    expect(hasVietnameseSupport('Cormorant Garamond')).toBe(false)
    expect(hasVietnameseSupport('')).toBe(false)
  })

  it('compiles granular heading and paragraph typography styles into theme CSS', () => {
    const customConfig: ThemeConfig = {
      name: 'typo-test',
      version: 1,
      tokens: {
        colors: {
          primary: '#0e6b66',
          background: '#ffffff',
          surface: '#f8faf9',
          text: '#17201f',
          border: '#dfe5e2',
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          fontFamilyHeading: 'Plus Jakarta Sans, sans-serif',
          baseFontSize: '18px',
          baseLineHeight: '1.7',
          h1: { size: '48px', lineHeight: '1.2', weight: '800', letterSpacing: '-0.03em' },
          h2: { size: '36px', lineHeight: '1.25', weight: '700' },
          p1: { size: '20px', lineHeight: '1.6', weight: '400' },
        },
        spacing: { md: '16px' },
        layout: { containerWidth: '1200px' },
        radius: { md: '8px' },
      },
    }

    const css = generateThemeCss(customConfig)

    expect(css).toContain('--zyvavu-theme-font: Inter, sans-serif;')
    expect(css).toContain('--zyvavu-theme-font-heading: Plus Jakarta Sans, sans-serif;')
    expect(css).toContain('--zyvavu-theme-h1-size: 48px;')
    expect(css).toContain('--zyvavu-theme-h1-weight: 800;')
    expect(css).toContain('--zyvavu-theme-h1-line-height: 1.2;')
  })

  it('exports reusable TypographyStyleModal and WixTypographyPanel components', async () => {
    const modalModule = await import('@/components/admin/theme-customizer/TypographyStyleModal')
    const panelModule = await import('@/components/admin/theme-customizer/WixTypographyPanel')

    expect(typeof modalModule.TypographyStyleModal).toBe('function')
    expect(typeof panelModule.WixTypographyPanel).toBe('function')
    expect(typeof panelModule.TypographyStyleModal).toBe('function')
  })
})

describe('Theme Style Customizer — Dynamic Shadow Color Calculation', () => {
  it('calculates soft, medium, and strong shadow tints for light backgrounds', () => {
    const soft = calculateShadowColor('#ffffff', 'soft')
    const medium = calculateShadowColor('#ffffff', 'medium')
    const strong = calculateShadowColor('#ffffff', 'strong')

    expect(soft).toBe('#e6e6e6')
    expect(medium).toBe('#c2c2c2')
    expect(strong).toBe('#858585')
  })

  it('calculates appropriate deep shadow tints for dark backgrounds', () => {
    const soft = calculateShadowColor('#0b0f19', 'soft')
    const medium = calculateShadowColor('#0b0f19', 'medium')
    const strong = calculateShadowColor('#0b0f19', 'strong')

    expect(soft).toBe('#070a10')
    expect(medium).toBe('#040509')
    expect(strong).toBe('#010102')
  })

  it('returns safe fallback shadow colors when background color string is invalid', () => {
    expect(calculateShadowColor('not-a-color', 'soft')).toBe('#e6eceb')
    expect(calculateShadowColor('', 'medium')).toBe('#bfd0cd')
    expect(calculateShadowColor('invalid', 'strong')).toBe('#7a9692')
  })

  it('handles edge case of pure black background', () => {
    expect(calculateShadowColor('#000000', 'soft')).toBe('#000000')
    expect(calculateShadowColor('#000000', 'medium')).toBe('#000000')
    expect(calculateShadowColor('#000000', 'strong')).toBe('#000000')
  })
})




