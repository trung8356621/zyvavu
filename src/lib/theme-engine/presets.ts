import type { ColorPreset, ThemeTokens, TypographyPreset } from './types'

export const COLOR_TOKEN_KEYS = [
  'primary', 'primaryHover', 'background', 'surface', 'text', 'textMuted', 'border',
  'accent', 'shadowSoft', 'shadowMedium', 'shadowStrong', 'headerBackground', 'headerText',
  'headerBorder',
] as const

export const BUILTIN_COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'default-teal',
    name: 'Zyvavu Default',
    description: 'Fresh emerald teal with clean, high-contrast crisp surfaces',
    colors: {
      primary: '#0e6b66',
      primaryHover: '#0b5652',
      background: '#ffffff',
      surface: '#f8faf9',
      text: '#17201f',
      textMuted: '#5f7370',
      border: '#dfe5e2',
      accent: '#2b8a7f',
      shadowSoft: '#e6eceb',
      shadowMedium: '#bfd0cd',
      shadowStrong: '#7a9692',
    },
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    description: 'Deep modern dark mode with vibrant electric indigo and cyan accents',
    colors: {
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      background: '#0b0f19',
      surface: '#111827',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      border: '#1f2937',
      accent: '#38bdf8',
      shadowSoft: '#1e293b',
      shadowMedium: '#334155',
      shadowStrong: '#475569',
    },
  },
  {
    id: 'forest-emerald',
    name: 'Forest Minimal',
    description: 'Earthy organic green palette balanced for sustainability and architecture',
    colors: {
      primary: '#2d6a4f',
      primaryHover: '#1b4332',
      background: '#fbfbfa',
      surface: '#ffffff',
      text: '#1b261e',
      textMuted: '#526b5a',
      border: '#d8e2dc',
      accent: '#52b788',
      shadowSoft: '#e2ece5',
      shadowMedium: '#b7d1bf',
      shadowStrong: '#749c82',
    },
  },
  {
    id: 'warm-terracotta',
    name: 'Warm Terracotta',
    description: 'Inviting Mediterranean terracotta and sunlit cream tones',
    colors: {
      primary: '#c2410c',
      primaryHover: '#9a3412',
      background: '#fffdfa',
      surface: '#fef3c7',
      text: '#292524',
      textMuted: '#78716c',
      border: '#fed7aa',
      accent: '#ea580c',
      shadowSoft: '#f5ebe1',
      shadowMedium: '#dfc6b0',
      shadowStrong: '#a68265',
    },
  },
  {
    id: 'corporate-slate',
    name: 'Corporate Slate',
    description: 'Authoritative sapphire blue and slate gray engineered for enterprise',
    colors: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
      accent: '#3b82f6',
      shadowSoft: '#e2e8f0',
      shadowMedium: '#cbd5e1',
      shadowStrong: '#94a3b8',
    },
  },
  {
    id: 'ruby-editorial',
    name: 'Ruby Editorial',
    description: 'Bold burgundy and soft rose tint suited for premium magazines',
    colors: {
      primary: '#be123c',
      primaryHover: '#9f1239',
      background: '#fffbfb',
      surface: '#fff1f2',
      text: '#1c1917',
      textMuted: '#78716c',
      border: '#fecdd3',
      accent: '#f43f5e',
      shadowSoft: '#f5e1e4',
      shadowMedium: '#dfb8be',
      shadowStrong: '#a3727a',
    },
  },
  {
    id: 'modern-monochrome',
    name: 'Modern Monochrome',
    description: 'Timeless high-contrast black, pure white, and neutral zinc gray',
    colors: {
      primary: '#18181b',
      primaryHover: '#27272a',
      background: '#ffffff',
      surface: '#f4f4f5',
      text: '#09090b',
      textMuted: '#71717a',
      border: '#e4e4e7',
      accent: '#52525b',
      shadowSoft: '#e4e4e7',
      shadowMedium: '#d4d4d8',
      shadowStrong: '#a1a1aa',
    },
  },
]

export const BUILTIN_TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    id: 'modern-clean',
    name: 'Modern Clean',
    description: 'Inter geometric sans-serif pairing for crisp clarity and modern UI',
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontFamilyHeading: 'Inter, system-ui, -apple-system, sans-serif',
      baseFontSize: '17px',
      baseLineHeight: '1.7',
      h1: { size: '42px', lineHeight: '1.2', weight: '700', letterSpacing: '-0.02em' },
      h2: { size: '30px', lineHeight: '1.25', weight: '600', letterSpacing: '-0.015em' },
      h3: { size: '22px', lineHeight: '1.35', weight: '600', letterSpacing: '-0.01em' },
      h4: { size: '18px', lineHeight: '1.4', weight: '600' },
      h5: { size: '16px', lineHeight: '1.45', weight: '600' },
      h6: { size: '14px', lineHeight: '1.5', weight: '600' },
      p1: { size: '17px', lineHeight: '1.7', weight: '400' },
      p2: { size: '15px', lineHeight: '1.6', weight: '400' },
      p3: { size: '13px', lineHeight: '1.5', weight: '400' },
    },
  },
  {
    id: 'editorial-elegance',
    name: 'Editorial Elegance',
    description: 'Playfair Display editorial serif headlines with Lora reading body text',
    typography: {
      fontFamily: 'Lora, Georgia, serif',
      fontFamilyHeading: "'Playfair Display', Georgia, serif",
      baseFontSize: '18px',
      baseLineHeight: '1.75',
      h1: { size: '46px', lineHeight: '1.15', weight: '700', letterSpacing: '-0.01em' },
      h2: { size: '34px', lineHeight: '1.25', weight: '600', letterSpacing: '-0.01em' },
      h3: { size: '26px', lineHeight: '1.3', weight: '600' },
      h4: { size: '20px', lineHeight: '1.35', weight: '600' },
      h5: { size: '17px', lineHeight: '1.4', weight: '600' },
      h6: { size: '15px', lineHeight: '1.45', weight: '600' },
      p1: { size: '18px', lineHeight: '1.75', weight: '400' },
      p2: { size: '16px', lineHeight: '1.65', weight: '400' },
      p3: { size: '14px', lineHeight: '1.55', weight: '400' },
    },
  },
  {
    id: 'tech-b2b',
    name: 'Tech Enterprise',
    description: 'Plus Jakarta Sans tech-forward headlines paired with versatile Inter',
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontFamilyHeading: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      baseFontSize: '16px',
      baseLineHeight: '1.65',
      h1: { size: '40px', lineHeight: '1.2', weight: '800', letterSpacing: '-0.025em' },
      h2: { size: '28px', lineHeight: '1.25', weight: '700', letterSpacing: '-0.02em' },
      h3: { size: '22px', lineHeight: '1.35', weight: '600', letterSpacing: '-0.01em' },
      h4: { size: '18px', lineHeight: '1.4', weight: '600' },
      h5: { size: '15px', lineHeight: '1.45', weight: '600' },
      h6: { size: '13px', lineHeight: '1.5', weight: '600' },
      p1: { size: '16px', lineHeight: '1.65', weight: '400' },
      p2: { size: '14px', lineHeight: '1.6', weight: '400' },
      p3: { size: '12px', lineHeight: '1.5', weight: '400' },
    },
  },
  {
    id: 'warm-humanist',
    name: 'Warm Humanist',
    description: 'Friendly Outfit headlines paired with Open Sans for open warmth',
    typography: {
      fontFamily: "'Open Sans', system-ui, -apple-system, sans-serif",
      fontFamilyHeading: 'Outfit, system-ui, -apple-system, sans-serif',
      baseFontSize: '17px',
      baseLineHeight: '1.7',
      h1: { size: '44px', lineHeight: '1.2', weight: '700', letterSpacing: '-0.01em' },
      h2: { size: '32px', lineHeight: '1.25', weight: '600' },
      h3: { size: '24px', lineHeight: '1.3', weight: '600' },
      h4: { size: '19px', lineHeight: '1.35', weight: '600' },
      h5: { size: '16px', lineHeight: '1.4', weight: '600' },
      h6: { size: '14px', lineHeight: '1.45', weight: '600' },
      p1: { size: '17px', lineHeight: '1.7', weight: '400' },
      p2: { size: '15px', lineHeight: '1.6', weight: '400' },
      p3: { size: '13px', lineHeight: '1.5', weight: '400' },
    },
  },
  {
    id: 'system-native',
    name: 'System Native',
    description: 'Instant loading native operating system typography with zero network requests',
    typography: {
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontFamilyHeading:
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      baseFontSize: '18px',
      baseLineHeight: '1.75',
      h1: { size: '44px', lineHeight: '1.2', weight: '700' },
      h2: { size: '32px', lineHeight: '1.3', weight: '600' },
      h3: { size: '24px', lineHeight: '1.4', weight: '600' },
      h4: { size: '20px', lineHeight: '1.4', weight: '600' },
      h5: { size: '16px', lineHeight: '1.45', weight: '600' },
      h6: { size: '14px', lineHeight: '1.5', weight: '600' },
      p1: { size: '18px', lineHeight: '1.75', weight: '400' },
      p2: { size: '15px', lineHeight: '1.6', weight: '400' },
      p3: { size: '13px', lineHeight: '1.5', weight: '400' },
    },
  },
]

/**
 * Validates a color string strictly. Supports 3/6/8-digit hex, rgb/rgba, hsl/hsla, and common CSS names.
 * Blocks javascript:, expression, url(), and script injection.
 */
const colorPatterns = [
  /^#(?:[a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i,
  /^rgba?\(\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i,
  /^hsla?\(\s*(\d{1,3}(?:deg)?)\s*,\s*(\d{1,3}%)\s*,\s*(\d{1,3}%)(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i,
  /^(?:transparent|currentcolor|inherit|initial|black|white)$/i,
]

export function validateColorString(color: string): boolean {
  if (typeof color !== 'string') return false
  const trimmed = color.trim()
  return trimmed.length <= 50 && colorPatterns.some((pattern) => pattern.test(trimmed))
}

/**
 * Parses hex color to RGB channels [0..255].
 */
export function parseColorToRgb(color: string): [number, number, number] | null {
  if (!color || typeof color !== 'string') return null
  const hex = color.trim().replace(/^#/, '')

  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16)
    const g = parseInt(hex[1] + hex[1], 16)
    const b = parseInt(hex[2] + hex[2], 16)
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b]
  }

  if (hex.length >= 6) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b]
  }

  return null
}

/**
 * Calculates relative luminance according to WCAG 2.1 specs.
 */
export function getRelativeLuminance(rgb: [number, number, number]): number {
  const sRGB = rgb.map((val) => {
    const c = val / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
}

/**
 * Calculates WCAG contrast ratio between two colors.
 * Returns ratio and readability warning if ratio < 4.5:1 for standard text.
 */
export function calculateContrastRatio(
  foreground: string,
  background: string,
): { ratio: number; isReadable: boolean; warning?: string } {
  const fgRgb = parseColorToRgb(foreground)
  const bgRgb = parseColorToRgb(background)

  if (!fgRgb || !bgRgb) {
    return { ratio: 1, isReadable: true }
  }

  const l1 = getRelativeLuminance(fgRgb)
  const l2 = getRelativeLuminance(bgRgb)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  const ratio = Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
  const isReadable = ratio >= 4.5

  let warning: string | undefined
  if (!isReadable) {
    warning = `Low contrast: ${ratio}:1. WCAG AA recommends at least 4.5:1 for comfortable readability.`
  }

  return { ratio, isReadable, warning }
}

/** Selects only the theme's two semantic foreground candidates for an opaque solid. */
export function resolveContrastForegroundToken(
  solid: string,
  text: string,
  background: string,
): 'text' | 'background' | undefined {
  // Existing luminance utility accepts HEX. Reject unknown/translucent CSS rather
  // than claim readability from its permissive legacy parser or rounded ratio.
  const opaque = (color: string) =>
    /^#(?:[a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{6}ff)$/i.test(color.trim())
  if (![solid, text, background].every(opaque)) return undefined
  const luminance = [solid, text, background].map((color) =>
    getRelativeLuminance(parseColorToRgb(color)!),
  )
  const ratio = (candidate: number) =>
    (Math.max(luminance[0], candidate) + 0.05) / (Math.min(luminance[0], candidate) + 0.05)
  const current = ratio(luminance[1])
  if (current >= 4.5) return 'text'
  return ratio(luminance[2]) > current ? 'background' : 'text'
}

/**
 * Calculates a shadow color token ('shadowSoft' | 'shadowMedium' | 'shadowStrong')
 * derived from a given background color.
 * For light backgrounds: generates soft, medium, and strong dark tints.
 * For dark backgrounds: generates appropriate dark depth tints.
 */
export function calculateShadowColor(
  backgroundColor: string,
  level: 'soft' | 'medium' | 'strong',
): string {
  const rgb = parseColorToRgb(backgroundColor)
  if (!rgb) {
    if (level === 'soft') return '#e6eceb'
    if (level === 'medium') return '#bfd0cd'
    return '#7a9692'
  }

  const lum = getRelativeLuminance(rgb)
  const isLight = lum >= 0.5

  let factor: number
  if (isLight) {
    factor = level === 'soft' ? 0.9 : level === 'medium' ? 0.76 : 0.52
  } else {
    factor = level === 'soft' ? 0.65 : level === 'medium' ? 0.35 : 0.08
  }

  const r = Math.min(255, Math.max(0, Math.round(rgb[0] * factor)))
  const g = Math.min(255, Math.max(0, Math.round(rgb[1] * factor)))
  const b = Math.min(255, Math.max(0, Math.round(rgb[2] * factor)))

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Strict validator for Theme tokens payload before persistence.
 */
export function validateThemeTokens(
  tokens: unknown,
  options?: { strict: true },
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (options) {
    validateTokenFields(tokens, themeCustomizeTokenSchema, 'tokens', errors)
    return { valid: errors.length === 0, errors }
  }

  if (!tokens || typeof tokens !== 'object') {
    return { valid: false, errors: ['Tokens must be a non-null object.'] }
  }

  const tok = tokens as Partial<ThemeTokens>

  // Validate colors
  if (tok.colors) {
    if (typeof tok.colors !== 'object') {
      errors.push('tokens.colors must be an object.')
    } else {
      for (const [key, val] of Object.entries(tok.colors)) {
        if (typeof val !== 'string' || !validateColorString(val)) {
          errors.push(`Invalid color format for "${key}": ${String(val)}`)
        }
      }
    }
  }

  // Validate typography
  if (tok.typography) {
    if (typeof tok.typography !== 'object') {
      errors.push('tokens.typography must be an object.')
    } else {
      const typo = tok.typography
      if (typo.fontFamily && typeof typo.fontFamily !== 'string') {
        errors.push('fontFamily must be a string.')
      } else if (typo.fontFamily && /[<>{}\\\/`$]/.test(typo.fontFamily)) {
        errors.push('fontFamily contains invalid characters.')
      }

      if (typo.fontFamilyHeading && typeof typo.fontFamilyHeading !== 'string') {
        errors.push('fontFamilyHeading must be a string.')
      } else if (typo.fontFamilyHeading && /[<>{}\\\/`$]/.test(typo.fontFamilyHeading)) {
        errors.push('fontFamilyHeading contains invalid characters.')
      }

      // Validate heading styles
      for (const h of TYPOGRAPHY_ROLES) {
        const item = (typo as any)[h]
        if (item && typeof item === 'object') {
          if (
            item.size &&
            (typeof item.size !== 'string' || !/^\d+(\.\d+)?(px|rem|em|%)$/.test(item.size))
          ) {
            errors.push(`Invalid font size format for "${h}": ${item.size}`)
          }
          if (
            item.lineHeight &&
            (typeof item.lineHeight !== 'string' ||
              !/^\d+(\.\d+)?(px|rem|em|%)?$/.test(item.lineHeight))
          ) {
            errors.push(`Invalid line height format for "${h}": ${item.lineHeight}`)
          }
          if (
            item.weight &&
            (typeof item.weight !== 'string' ||
              !/^(normal|bold|bolder|lighter|\d{3})$/.test(item.weight))
          ) {
            errors.push(`Invalid font weight for "${h}": ${item.weight}`)
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export const TYPOGRAPHY_ROLES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p1', 'p2', 'p3'] as const

type TokenField =
  | { type: 'object'; properties: Record<string, TokenField>; required: string[]; minProperties: number; additionalProperties: false }
  | { type: 'string'; maxLength: number; trim?: true; enum?: readonly string[]; patterns?: { source: string; flags: string }[] }

const tokenObject = (properties: Record<string, TokenField>): TokenField =>
  ({ type: 'object', properties, required: [], minProperties: 1, additionalProperties: false })

const tokenString = (patterns: RegExp[], maxLength = 250, trim?: true): TokenField => ({
  type: 'string',
  maxLength,
  ...(trim ? { trim } : {}),
  patterns: patterns.map(({ source, flags }) => ({ source, flags })),
})

const tokenChoices = (values: readonly string[]): TokenField =>
  ({ type: 'string', maxLength: Math.max(...values.map((value) => value.length)), enum: values })

const scale = <T extends string>(keys: readonly T[], field: TokenField): Record<T, TokenField> =>
  Object.fromEntries(keys.map((key) => [key, field])) as Record<T, TokenField>

const spacingKeys = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const
const cssSize = tokenString([/^(?:0|\d{1,5}(?:\.\d{1,6})?(?:px|rem|em|%|ch|vw|vh))$/])
const fontSize = tokenString([/^\d{1,5}(?:\.\d{1,6})?(?:px|rem|em|%)$/])
const lineHeight = tokenString([/^\d{1,5}(?:\.\d{1,6})?(?:px|rem|em|%)?$/])
const fontName = tokenString([
  /^(?:[\p{L}\p{N} -]+|'[\p{L}\p{N} -]+'|"[\p{L}\p{N} -]+")(?: *, *(?:[\p{L}\p{N} -]+|'[\p{L}\p{N} -]+'|"[\p{L}\p{N} -]+"))*$/u,
], 250, true)
const solidColor = tokenString(colorPatterns, 50, true)
const typographyRole = tokenObject({
  size: fontSize,
  lineHeight,
  weight: tokenString([/^(?:normal|bold|bolder|lighter|[1-9]00)$/]),
  letterSpacing: tokenString([/^(?:normal|0|-?\d{1,5}(?:\.\d{1,6})?(?:px|rem|em|%|ch|vw|vh))$/]),
  color: solidColor,
})

/** Published by MCP and enforced by strict Theme Customize validation. */
export const themeCustomizeTokenSchema = tokenObject({
  colors: tokenObject(scale(COLOR_TOKEN_KEYS, solidColor)),
  typography: tokenObject({
    fontFamily: fontName,
    fontFamilyHeading: fontName,
    baseFontSize: fontSize,
    baseLineHeight: lineHeight,
    ...scale(TYPOGRAPHY_ROLES, typographyRole),
  }),
  spacing: tokenObject(scale(spacingKeys, cssSize)),
  layout: tokenObject({
    containerWidth: cssSize,
    narrowWidth: cssSize,
    wideWidth: cssSize,
    alignment: tokenChoices(['left', 'center', 'right']),
    pageSpacing: tokenString([
      new RegExp('^(?:' + spacingKeys.join('|') + ')$'),
      /^\d{1,5}(?:\.\d{1,6})?(?:px|rem)$/,
    ]),
  }),
  radius: tokenObject(scale(['sm', 'md', 'lg', 'pill'], cssSize)),
})

/** File themeId is informational only — destination is the locked Theme ID passed by the import caller. */
export function validateThemeImportDocument(document: unknown, _destinationThemeId?: string) {
  if (!document || typeof document !== 'object' || Array.isArray(document) ||
      !Object.hasOwn(document, 'tokens') ||
      Object.keys(document).some((key) => key !== 'themeId' && key !== 'tokens')) {
    return { valid: false, errors: ['The file must contain tokens and may include a themeId.'] }
  }
  const file = document as { themeId?: unknown; tokens: unknown }
  if (Object.hasOwn(file, 'themeId') && typeof file.themeId !== 'string') {
    return { valid: false, errors: ['themeId must be a string when present.'] }
  }
  return validateThemeTokens(file.tokens, { strict: true })
}

function validateTokenFields(value: unknown, schema: TokenField, path: string, errors: string[]) {
  if (schema.type === 'string') {
    const candidate = schema.trim && typeof value === 'string' ? value.trim() : value
    if (typeof candidate !== 'string' || !candidate || candidate.length > schema.maxLength ||
      (schema.enum && !schema.enum.includes(candidate)) ||
      (schema.patterns && !schema.patterns.some(({ source, flags }) => new RegExp(source, flags).test(candidate)))) {
      errors.push('Invalid value at ' + path + '.')
    }
    return
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length < schema.minProperties) {
    errors.push(path + ' must be a non-empty object.')
    return
  }
  for (const [key, child] of Object.entries(value)) {
    const field = path + '.' + key
    if (!Object.hasOwn(schema.properties, key)) {
      errors.push('Unsupported field at ' + field + '.')
    } else {
      validateTokenFields(child, schema.properties[key], field, errors)
    }
  }
}
