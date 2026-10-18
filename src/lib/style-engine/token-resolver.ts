import type {
  GradientDef,
  LetterSpacingPreset,
  LineHeightPreset,
  MeshDef,
  PatternPreset,
  TextEffectPreset,
} from './types'
import {
  resolveColorToken as baseResolveColorToken,
  resolveContainerWidth as baseResolveContainerWidth,
  resolveRadiusToken as baseResolveRadiusToken,
  resolveSpacingToken as baseResolveSpacingToken,
} from '@/lib/theme-engine/page-settings'

export function resolveColorToken(token?: string, fallback?: string): string {
  if (!token) return fallback || 'inherit'
  return baseResolveColorToken(token, fallback) || fallback || 'inherit'
}

export function resolveContainerWidth(token?: string): string {
  return baseResolveContainerWidth(token)
}

export function resolveSpacingToken(token?: string): string | undefined {
  return baseResolveSpacingToken(token)
}

export function resolveRadiusToken(token?: string): string | undefined {
  if (!token || token === 'none') return '0px'
  if (token === 'pill') return '9999px'
  return baseResolveRadiusToken(token) || '0px'
}

export function resolveBorderWidthToken(token?: string): string {
  switch (token) {
    case 'none':
      return '0px'
    case 'thin':
      return '1px'
    case 'medium':
      return '2px'
    case 'thick':
      return '4px'
    default:
      return token || '1px'
  }
}

export function resolveShadowToken(token?: string): string | undefined {
  if (!token || token === 'none') return 'none'
  switch (token) {
    case 'shadowSoft':
    case 'subtle':
      return '0 2px 8px var(--zyvavu-theme-color-shadow-soft, rgba(0, 0, 0, 0.06))'
    case 'shadowMedium':
    case 'elevated':
      return '0 8px 24px var(--zyvavu-theme-color-shadow-medium, rgba(0, 0, 0, 0.12))'
    case 'shadowStrong':
      return '0 16px 40px var(--zyvavu-theme-color-shadow-strong, rgba(0, 0, 0, 0.20))'
    default:
      return `var(--zyvavu-theme-shadow-${token}, 0 4px 12px rgba(0,0,0,0.1))`
  }
}

export function resolveLetterSpacing(preset?: LetterSpacingPreset): string | undefined {
  switch (preset) {
    case 'tighter':
      return '-0.05em'
    case 'tight':
      return '-0.025em'
    case 'normal':
      return '0em'
    case 'wide':
      return '0.05em'
    case 'wider':
      return '0.1em'
    default:
      return undefined
  }
}

export function resolveLineHeight(preset?: LineHeightPreset): string | undefined {
  switch (preset) {
    case 'compact':
      return '1.2'
    case 'normal':
      return '1.5'
    case 'relaxed':
      return '1.75'
    case 'loose':
      return '2.0'
    default:
      return undefined
  }
}

export function resolveTextEffect(preset?: TextEffectPreset): {
  textShadow?: string
  WebkitTextStroke?: string
} {
  switch (preset) {
    case 'shadow-soft':
      return {
        textShadow: '0 2px 8px var(--zyvavu-theme-color-shadow-medium, rgba(0, 0, 0, 0.25))',
      }
    case 'shadow-hard':
      return {
        textShadow: '3px 3px 0px var(--zyvavu-theme-color-shadow-strong, rgba(0, 0, 0, 0.6))',
      }
    case 'outline':
      return {
        WebkitTextStroke: '1px var(--zyvavu-theme-border, #17201f)',
      }
    case 'glow':
      return {
        textShadow:
          '0 0 10px var(--zyvavu-theme-accent, #2ec4b6), 0 0 20px var(--zyvavu-theme-primary, #0e6b66)',
      }
    case 'subtle-depth':
      return {
        textShadow:
          '0 1px 1px rgba(0,0,0,0.15), 0 2px 2px rgba(0,0,0,0.12), 0 4px 4px rgba(0,0,0,0.08)',
      }
    case 'none':
    default:
      return {}
  }
}

/**
 * Serializes a GradientDef to standard CSS background-image syntax using theme CSS variables.
 */
export function serializeGradientCss(gradient?: GradientDef): string | undefined {
  if (!gradient || !Array.isArray(gradient.stops) || gradient.stops.length === 0) {
    return undefined
  }

  const stops = gradient.stops
    .map((s) => {
      const colorVal = resolveColorToken(s.token, s.color || '#000000')
      const pos = typeof s.position === 'number' ? `${s.position}%` : ''
      return `${colorVal} ${pos}`.trim()
    })
    .join(', ')

  if (gradient.type === 'radial') {
    return `radial-gradient(circle at center, ${stops})`
  }

  const angle = typeof gradient.angle === 'number' ? gradient.angle : 135
  return `linear-gradient(${angle}deg, ${stops})`
}

/**
 * Serializes a MeshDef to layered CSS radial-gradients referencing theme tokens.
 */
export function serializeMeshCss(mesh?: MeshDef): string | undefined {
  if (!mesh || !Array.isArray(mesh.points) || mesh.points.length === 0) {
    return undefined
  }

  const radialLayers = mesh.points.map((p) => {
    const colorVal = resolveColorToken(p.token, p.color || '#0e6b66')
    const x = typeof p.x === 'number' ? p.x : 50
    const y = typeof p.y === 'number' ? p.y : 50
    const radius = typeof p.radius === 'number' ? p.radius : 50
    return `radial-gradient(circle at ${x}% ${y}%, ${colorVal} 0%, transparent ${radius}%)`
  })

  return radialLayers.join(', ')
}

/**
 * Generates lightweight CSS pattern background image from preset.
 */
export function resolvePatternCss(preset?: PatternPreset): string | undefined {
  switch (preset) {
    case 'dots':
      return `radial-gradient(currentColor 1.5px, transparent 1.5px)`
    case 'grid':
      return `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`
    case 'diagonal':
      return `repeating-linear-gradient(45deg, currentColor, currentColor 1px, transparent 1px, transparent 12px)`
    case 'stripes':
      return `repeating-linear-gradient(0deg, currentColor, currentColor 1px, transparent 1px, transparent 16px)`
    case 'noise':
      return `radial-gradient(rgba(0,0,0,0.15) 1px, transparent 0)`
    case 'none':
    default:
      return undefined
  }
}

export function resolvePatternSize(preset?: PatternPreset): string | undefined {
  switch (preset) {
    case 'dots':
      return '20px 20px'
    case 'grid':
      return '24px 24px'
    case 'noise':
      return '4px 4px'
    case 'diagonal':
      return '24px 24px'
    case 'stripes':
      return '16px 16px'
    default:
      return undefined
  }
}
