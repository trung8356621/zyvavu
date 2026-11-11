import type {
  ResponsiveConfig,
  ResponsiveStyleOverride,
  SpacingConfig,
  TextAlign,
  TypographyStyleConfig,
  UniversalStyle,
} from './types'
import {
  resolveFontSizeToken,
  resolveLineHeight,
  resolveSpacingToken,
} from './token-resolver'

/**
 * Breakpoints reused from existing frontend / Theme Customizer conventions.
 * - tabletMax 1024: matches `styles.css` @media (max-width: 1024px) and tablet preview band
 * - mobileMax 767: below Puck tablet viewport width (768)
 * Ordering: desktop base → tablet (@media max tabletMax) → mobile (@media max mobileMax).
 */
export const RESPONSIVE_BREAKPOINTS = {
  tabletMax: 1024,
  mobileMax: 767,
} as const

export type ResponsiveBreakpoint = 'desktop' | 'tablet' | 'mobile'

export type ResponsiveTypographyKeys = 'fontSize' | 'lineHeight' | 'align'

function cssEscapeIdent(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function spacingDecls(spacing?: SpacingConfig): string[] {
  if (!spacing) return []
  const out: string[] = []
  if (typeof (spacing as unknown) === 'string') {
    const pad = resolveSpacingToken(spacing as unknown as string)
    if (pad) out.push(`padding:${pad}`)
    return out
  }
  if (spacing.padding?.token) {
    const pad = resolveSpacingToken(spacing.padding.token)
    if (pad) out.push(`padding:${pad}`)
  } else if (spacing.padding) {
    if (spacing.padding.topToken) {
      const v = resolveSpacingToken(spacing.padding.topToken)
      if (v) out.push(`padding-top:${v}`)
    }
    if (spacing.padding.rightToken) {
      const v = resolveSpacingToken(spacing.padding.rightToken)
      if (v) out.push(`padding-right:${v}`)
    }
    if (spacing.padding.bottomToken) {
      const v = resolveSpacingToken(spacing.padding.bottomToken)
      if (v) out.push(`padding-bottom:${v}`)
    }
    if (spacing.padding.leftToken) {
      const v = resolveSpacingToken(spacing.padding.leftToken)
      if (v) out.push(`padding-left:${v}`)
    }
  }
  if (spacing.margin?.token) {
    const m = resolveSpacingToken(spacing.margin.token)
    if (m) out.push(`margin:${m}`)
  } else if (spacing.margin) {
    if (spacing.margin.topToken) {
      const v = resolveSpacingToken(spacing.margin.topToken)
      if (v) out.push(`margin-top:${v}`)
    }
    if (spacing.margin.bottomToken) {
      const v = resolveSpacingToken(spacing.margin.bottomToken)
      if (v) out.push(`margin-bottom:${v}`)
    }
  }
  if (spacing.gapToken) {
    const g = resolveSpacingToken(spacing.gapToken)
    if (g) out.push(`gap:${g}`)
  }
  return out
}

function typographyDecls(typo?: ResponsiveStyleOverride['typography']): string[] {
  if (!typo) return []
  const out: string[] = []
  if (typo.fontSize) {
    const size = resolveFontSizeToken(typo.fontSize)
    if (size) out.push(`font-size:${size}`)
  }
  if (typo.lineHeight) {
    const lh = resolveLineHeight(typo.lineHeight)
    if (lh) out.push(`line-height:${lh}`)
  }
  if (typo.align) out.push(`text-align:${typo.align}`)
  return out
}

function overrideDecls(override?: ResponsiveStyleOverride): string {
  if (!override) return ''
  const decls = [
    ...typographyDecls(override.typography),
    ...(override.align && !override.typography?.align ? [`text-align:${override.align}`] : []),
    ...spacingDecls(override.spacing),
  ]
  // Responsive declarations must take precedence over renderer-owned inline base styles.
  return decls.map((decl) => `${decl}!important`).join(';')
}

export function hasResponsiveStyleOverrides(responsive?: ResponsiveConfig | null): boolean {
  if (!responsive) return false
  return Boolean(
    overrideDecls(responsive.tablet) || overrideDecls(responsive.mobile),
  )
}

/**
 * Build scoped @media CSS for Canvas + frontend parity.
 * Desktop remains inline/base styles from resolveWidgetStyles — never rewritten here.
 */
export function serializeResponsiveStyleSheet(
  widgetId: string | undefined,
  style?: UniversalStyle | null,
): string {
  if (!widgetId || !style?.responsive) return ''
  const tabletDecls = overrideDecls(style.responsive.tablet)
  const mobileDecls = overrideDecls(style.responsive.mobile)
  if (!tabletDecls && !mobileDecls) return ''

  const sel = `[data-zyvavu-style-id="${cssEscapeIdent(widgetId)}"]`
  let css = ''
  if (tabletDecls) {
    css += `@media (max-width:${RESPONSIVE_BREAKPOINTS.tabletMax}px){${sel}{${tabletDecls}}}`
  }
  if (mobileDecls) {
    css += `@media (max-width:${RESPONSIVE_BREAKPOINTS.mobileMax}px){${sel}{${mobileDecls}}}`
  }
  return css
}

export function responsiveStyleIdProps(widgetId?: string): Record<string, string> {
  if (!widgetId) return {}
  return { 'data-zyvavu-style-id': cssEscapeIdent(widgetId) }
}

/** Display-only merge: desktop base + optional breakpoint override (never persist result). */
export function effectiveTypographyAtBreakpoint(
  desktop: TypographyStyleConfig | undefined,
  responsive: ResponsiveConfig | undefined,
  breakpoint: ResponsiveBreakpoint,
): TypographyStyleConfig {
  const base = desktop || {}
  if (breakpoint === 'desktop') return base
  return {
    ...base,
    ...responsive?.tablet?.typography,
    ...(breakpoint === 'mobile' ? responsive?.mobile?.typography : undefined),
  }
}

export function effectiveSpacingAtBreakpoint(
  desktop: SpacingConfig | undefined,
  responsive: ResponsiveConfig | undefined,
  breakpoint: ResponsiveBreakpoint,
): SpacingConfig {
  if (breakpoint === 'desktop') return desktop || {}
  return responsive?.[breakpoint]?.spacing || desktop || {}
}

export function effectiveAlignAtBreakpoint(
  desktopAlign: TextAlign | undefined,
  responsive: ResponsiveConfig | undefined,
  breakpoint: ResponsiveBreakpoint,
): TextAlign | undefined {
  if (breakpoint === 'desktop') return desktopAlign
  return (
    responsive?.[breakpoint]?.typography?.align ||
    responsive?.[breakpoint]?.align ||
    (breakpoint === 'mobile' ? responsive?.tablet?.typography?.align || responsive?.tablet?.align : undefined) ||
    desktopAlign
  )
}

/** Clear one typography key at a breakpoint without touching hide/stack or sibling keys. */
export function resetResponsiveTypographyProperty(
  responsive: ResponsiveConfig | undefined,
  breakpoint: 'tablet' | 'mobile',
  key: ResponsiveTypographyKeys,
): ResponsiveConfig | undefined {
  const current = { ...(responsive || {}) }
  const bp = { ...(current[breakpoint] || {}) }
  const typography = { ...(bp.typography || {}) }
  delete typography[key]
  if (key === 'align' && bp.align) delete bp.align
  if (Object.keys(typography).length) bp.typography = typography
  else delete bp.typography
  if (!bp.typography && !bp.spacing && !bp.align) delete current[breakpoint]
  else current[breakpoint] = bp
  const cleaned = pruneResponsive(current)
  return cleaned
}

export function resetResponsiveSpacing(
  responsive: ResponsiveConfig | undefined,
  breakpoint: 'tablet' | 'mobile',
): ResponsiveConfig | undefined {
  const current = { ...(responsive || {}) }
  const bp = { ...(current[breakpoint] || {}) }
  delete bp.spacing
  if (!bp.typography && !bp.spacing && !bp.align) delete current[breakpoint]
  else current[breakpoint] = bp
  return pruneResponsive(current)
}

export function setResponsiveTypographyProperty(
  responsive: ResponsiveConfig | undefined,
  breakpoint: 'tablet' | 'mobile',
  key: ResponsiveTypographyKeys,
  value: string | undefined,
): ResponsiveConfig {
  const current: ResponsiveConfig = { ...(responsive || {}) }
  const bp: ResponsiveStyleOverride = { ...(current[breakpoint] || {}) }
  const typography = { ...(bp.typography || {}) }
  if (value === undefined || value === null || value === '') delete typography[key]
  else (typography as Record<string, string>)[key] = value
  if (Object.keys(typography).length) bp.typography = typography
  else delete bp.typography
  if (key === 'align') {
    // Keep typography.align as SoT; drop legacy flat if present.
    delete bp.align
  }
  if (!bp.typography && !bp.spacing && !bp.align) delete current[breakpoint]
  else current[breakpoint] = bp
  return current
}

export function setResponsiveSpacing(
  responsive: ResponsiveConfig | undefined,
  breakpoint: 'tablet' | 'mobile',
  spacing: SpacingConfig | undefined,
): ResponsiveConfig {
  const current: ResponsiveConfig = { ...(responsive || {}) }
  const bp: ResponsiveStyleOverride = { ...(current[breakpoint] || {}) }
  if (!spacing || !Object.keys(spacing).length) delete bp.spacing
  else bp.spacing = spacing
  if (!bp.typography && !bp.spacing && !bp.align) delete current[breakpoint]
  else current[breakpoint] = bp
  return current
}

function pruneResponsive(responsive: ResponsiveConfig): ResponsiveConfig | undefined {
  const keys = Object.keys(responsive).filter(
    (k) => (responsive as Record<string, unknown>)[k] !== undefined,
  )
  return keys.length ? responsive : undefined
}

/** True when nested style overrides exist (ignore hide/stack-only configs). */
export function responsiveHasStyleOverrides(responsive?: ResponsiveConfig): boolean {
  return hasResponsiveStyleOverrides(responsive)
}
