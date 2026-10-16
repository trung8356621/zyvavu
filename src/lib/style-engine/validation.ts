import type { UniversalStyle } from './types'

export interface StyleValidationResult {
  valid: boolean
  errors: string[]
}

const VALID_BG_MODES = ['color', 'image', 'video']
const VALID_IMAGE_SIZES = ['cover', 'contain', 'auto']
const VALID_IMAGE_REPEATS = ['no-repeat', 'repeat', 'repeat-x', 'repeat-y']
const VALID_PATTERN_PRESETS = ['none', 'dots', 'grid', 'diagonal', 'stripes', 'noise']
const VALID_TEXT_EFFECTS = ['none', 'shadow-soft', 'shadow-hard', 'outline', 'glow', 'subtle-depth']
const VALID_LETTER_SPACING = ['tighter', 'tight', 'normal', 'wide', 'wider']
const VALID_LINE_HEIGHT = ['compact', 'normal', 'relaxed', 'loose']

/**
 * Validates a UniversalStyle object against Atomic Design System rules.
 */
export function validateUniversalStyle(style: unknown): StyleValidationResult {
  const errors: string[] = []

  if (!style) {
    return { valid: true, errors: [] }
  }

  if (typeof style !== 'object' || Array.isArray(style)) {
    return { valid: false, errors: ['Style definition must be an object'] }
  }

  const s = style as Record<string, any>

  // 1. Prohibit raw arbitrary CSS strings or script tags recursively
  const checkUnsafeStrings = (obj: any, path: string = '') => {
    if (!obj || typeof obj !== 'object') return
    for (const [key, val] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key
      if (typeof val === 'string') {
        if (/<script\b/i.test(val) || /javascript:/i.test(val) || /eval\s*\(/i.test(val)) {
          errors.push(`Unsafe script detected in style field "${currentPath}"`)
        }
      } else if (typeof val === 'object' && val !== null) {
        checkUnsafeStrings(val, currentPath)
      }
    }
  }
  checkUnsafeStrings(s)

  // 2. Typography domain validation
  if (s.typography) {
    if (typeof s.typography === 'string') {
      if (s.typography.includes('px') || s.typography.includes('rem')) {
        errors.push(
          `Direct font size "${s.typography}" is not permitted. Must use a semantic typography preset ID (e.g. "h1", "p1").`,
        )
      }
    } else if (typeof s.typography === 'object') {
      const typo = s.typography
      if (typo.typography && typeof typo.typography === 'string') {
        if (typo.typography.includes('px') || typo.typography.includes('rem')) {
          errors.push(
            `Direct font size "${typo.typography}" is not permitted. Must use a semantic typography preset ID (e.g. "h1", "p1").`,
          )
        }
      }

      if (typo.colorToken && typeof typo.colorToken === 'string') {
        if (typo.colorToken.startsWith('#') || typo.colorToken.startsWith('rgb')) {
          errors.push(
            `Direct color value "${typo.colorToken}" is not permitted for typography.colorToken. Must be a semantic token ID.`,
          )
        }
      }

      if (typo.effectPreset && !VALID_TEXT_EFFECTS.includes(typo.effectPreset)) {
        errors.push(`Invalid text effect preset "${typo.effectPreset}"`)
      }

      if (typo.letterSpacing && !VALID_LETTER_SPACING.includes(typo.letterSpacing)) {
        errors.push(`Invalid letter spacing preset "${typo.letterSpacing}"`)
      }

      if (typo.lineHeight && !VALID_LINE_HEIGHT.includes(typo.lineHeight)) {
        errors.push(`Invalid line height preset "${typo.lineHeight}"`)
      }
    }
  }

  // 3. Background domain validation
  if (s.background) {
    if (typeof s.background !== 'object') {
      errors.push('style.background must be an object')
    } else {
      const bg = s.background
      if (bg.mode && !VALID_BG_MODES.includes(bg.mode)) {
        errors.push(`Invalid background mode "${bg.mode}". Must be "color", "image", or "video".`)
      }

      if (bg.colorToken && typeof bg.colorToken === 'string') {
        if (bg.colorToken.startsWith('#') || bg.colorToken.startsWith('rgb')) {
          errors.push(`Direct color value "${bg.colorToken}" is not permitted for background.colorToken.`)
        }
      }

      // Gradient validation
      if (bg.gradient) {
        if (bg.gradient.type && !['linear', 'radial'].includes(bg.gradient.type)) {
          errors.push(`Invalid gradient type "${bg.gradient.type}"`)
        }
        if (typeof bg.gradient.angle === 'number') {
          if (bg.gradient.angle < 0 || bg.gradient.angle > 360) {
            errors.push('Gradient angle must be between 0 and 360 degrees')
          }
        }
        if (Array.isArray(bg.gradient.stops)) {
          for (const stop of bg.gradient.stops) {
            if (stop.token && (stop.token.startsWith('#') || stop.token.startsWith('rgb'))) {
              errors.push(`Gradient stop token "${stop.token}" must be a semantic token ID`)
            }
            if (typeof stop.position === 'number' && (stop.position < 0 || stop.position > 100)) {
              errors.push('Gradient stop position must be between 0 and 100%')
            }
          }
        }
      }

      // Mesh validation
      if (bg.mesh && Array.isArray(bg.mesh.points)) {
        for (const pt of bg.mesh.points) {
          if (pt.token && (pt.token.startsWith('#') || pt.token.startsWith('rgb'))) {
            errors.push(`Mesh point token "${pt.token}" must be a semantic token ID`)
          }
          if (typeof pt.x === 'number' && (pt.x < 0 || pt.x > 100)) {
            errors.push('Mesh point X position must be between 0 and 100%')
          }
          if (typeof pt.y === 'number' && (pt.y < 0 || pt.y > 100)) {
            errors.push('Mesh point Y position must be between 0 and 100%')
          }
        }
      }

      // Image validation
      if (bg.image) {
        if (bg.image.size && !VALID_IMAGE_SIZES.includes(bg.image.size)) {
          errors.push(`Invalid background image size "${bg.image.size}"`)
        }
        if (bg.image.repeat && !VALID_IMAGE_REPEATS.includes(bg.image.repeat)) {
          errors.push(`Invalid background image repeat "${bg.image.repeat}"`)
        }
        if (bg.image.pattern?.preset && !VALID_PATTERN_PRESETS.includes(bg.image.pattern.preset)) {
          errors.push(`Invalid pattern preset "${bg.image.pattern.preset}"`)
        }
        if (
          typeof bg.image.overlay?.opacity === 'number' &&
          (bg.image.overlay.opacity < 0 || bg.image.overlay.opacity > 1)
        ) {
          errors.push('Image overlay opacity must be between 0 and 1')
        }
      }

      // Video validation
      if (bg.video) {
        if (
          typeof bg.video.overlay?.opacity === 'number' &&
          (bg.video.overlay.opacity < 0 || bg.video.overlay.opacity > 1)
        ) {
          errors.push('Video overlay opacity must be between 0 and 1')
        }
      }
    }
  }

  // 4. Border & Radius validation
  if (s.border) {
    if (s.border.colorToken && (s.border.colorToken.startsWith('#') || s.border.colorToken.startsWith('rgb'))) {
      errors.push(`Direct color value "${s.border.colorToken}" is not permitted for border.colorToken`)
    }
  }

  // 5. Effects validation
  if (s.effects) {
    if (typeof s.effects.opacity === 'number' && (s.effects.opacity < 0 || s.effects.opacity > 1)) {
      errors.push('Effects opacity must be between 0 and 1')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
