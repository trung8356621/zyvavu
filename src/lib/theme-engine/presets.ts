import type { ColorPreset, ThemeTokens, TypographyPreset } from './types'

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
      fontFamilyHeading: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
export function validateColorString(color: string): boolean {
  if (typeof color !== 'string') return false
  const trimmed = color.trim()
  if (!trimmed || trimmed.length > 50) return false

  // Hex check (#fff, #ffffff, #ffffffff)
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return true
  }

  // rgb/rgba check
  if (/^rgba?\(\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)\s*,\s*(\d{1,3}%?)(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(trimmed)) {
    return true
  }

  // hsl/hsla check
  if (/^hsla?\(\s*(\d{1,3}(?:deg)?)\s*,\s*(\d{1,3}%)\s*,\s*(\d{1,3}%)(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(trimmed)) {
    return true
  }

  // Standard keyword colors
  const keywords = ['transparent', 'currentcolor', 'inherit', 'initial', 'black', 'white']
  return keywords.includes(trimmed.toLowerCase())
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

/**
 * Strict validator for Theme tokens payload before persistence.
 */
export function validateThemeTokens(tokens: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

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
      const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p1', 'p2', 'p3'] as const
      for (const h of headings) {
        const item = (typo as any)[h]
        if (item && typeof item === 'object') {
          if (item.size && (typeof item.size !== 'string' || !/^\d+(\.\d+)?(px|rem|em|%)$/.test(item.size))) {
            errors.push(`Invalid font size format for "${h}": ${item.size}`)
          }
          if (item.lineHeight && (typeof item.lineHeight !== 'string' || !/^\d+(\.\d+)?(px|rem|em|%)?$/.test(item.lineHeight))) {
            errors.push(`Invalid line height format for "${h}": ${item.lineHeight}`)
          }
          if (item.weight && (typeof item.weight !== 'string' || !/^(normal|bold|bolder|lighter|\d{3})$/.test(item.weight))) {
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
