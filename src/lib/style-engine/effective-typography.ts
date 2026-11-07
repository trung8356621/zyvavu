import type { ThemeConfig } from '@/lib/theme-engine/types'
import type { TypographyStyleConfig } from './types'
import { typographyPresetLabel } from './semantic-preset-labels'
import { resolveColorToken, resolveLetterSpacing, resolveLineHeight } from './token-resolver'

export type TypographyInheritSource =
  | 'override'
  | 'theme-preset'
  | 'html-tag'
  | 'theme'
  | 'unresolved'

export interface EffectiveTypographyField {
  /** Canonical display string for the control (never written to style until edited). */
  display: string
  /** Short source label, e.g. "Theme H2", "Override", "Theme". */
  sourceLabel: string
  source: TypographyInheritSource
  /** True when the widget has no explicit override for this field. */
  inherited: boolean
  /** True when theme/tag data could not resolve a reliable value. */
  unresolved: boolean
  /** Raw resolved value when known (px, weight number string, color hex/var, etc.). */
  raw?: string
}

export interface EffectiveTypography {
  basePreset: string | null
  fontFamily: EffectiveTypographyField
  fontWeight: EffectiveTypographyField
  fontSize: EffectiveTypographyField
  color: EffectiveTypographyField
  lineHeight: EffectiveTypographyField
  letterSpacing: EffectiveTypographyField
  align: EffectiveTypographyField
  fontStyle: EffectiveTypographyField
  textDecoration: EffectiveTypographyField
  textTransform: EffectiveTypographyField
}

type TypoSpec = {
  size?: string
  weight?: string
  lineHeight?: string
  letterSpacing?: string
  color?: string
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const BODY_PRESETS = new Set(['p1', 'p2', 'p3'])

function field(
  display: string,
  sourceLabel: string,
  source: TypographyInheritSource,
  inherited: boolean,
  raw?: string,
): EffectiveTypographyField {
  return {
    display,
    sourceLabel,
    source,
    inherited,
    unresolved: source === 'unresolved',
    raw,
  }
}

function unresolved(label = 'Unresolved'): EffectiveTypographyField {
  return field('—', label, 'unresolved', true)
}

function readTypoSpec(themeConfig: ThemeConfig | undefined, key: string | null): TypoSpec | null {
  if (!key || !themeConfig?.tokens?.typography) return null
  const spec = (themeConfig.tokens.typography as Record<string, unknown>)[key]
  if (!spec || typeof spec !== 'object') return null
  return spec as TypoSpec
}

/**
 * Resolve the theme typography preset key that drives inherited values.
 * Precedence: explicit typography preset → HTML tag (h1–h6) → widget default → body p1.
 */
export function resolveTypographyBasePreset(input: {
  override?: TypographyStyleConfig
  htmlTag?: string | null
  widgetType?: string | null
}): string | null {
  const preset = input.override?.typography?.trim()
  if (preset) return preset

  const tag = (input.htmlTag || '').toLowerCase()
  if (HEADING_TAGS.has(tag)) return tag

  if (input.widgetType === 'Heading') return 'h2'
  if (
    input.widgetType === 'DocumentTitle' ||
    input.widgetType === 'PostTitle' ||
    input.widgetType === 'CategoryTitle'
  )
    return 'h1'
  if (input.widgetType === 'Text' || input.widgetType === 'TextBlock') return 'p1'
  if (BODY_PRESETS.has(tag)) return tag
  return tag || 'p1'
}

function presetSourceLabel(preset: string | null, _via: 'theme-preset' | 'html-tag'): string {
  if (!preset) return 'Theme'
  return `Theme ${typographyPresetLabel(preset)}`
}

function formatWeight(weight?: string): string | undefined {
  if (!weight) return undefined
  return String(weight)
}

/**
 * Resolve effective typography for control display from theme + tag + overrides.
 * Does not persist computed defaults — callers must write only on user edit.
 */
export function resolveEffectiveTypography(input: {
  override?: TypographyStyleConfig
  themeConfig?: ThemeConfig
  htmlTag?: string | null
  widgetType?: string | null
}): EffectiveTypography {
  const override = input.override || {}
  const theme = input.themeConfig
  const typoTokens = theme?.tokens?.typography
  const basePreset = resolveTypographyBasePreset(input)
  const hasExplicitPreset = Boolean(override.typography)
  const tag = (input.htmlTag || '').toLowerCase()
  const inheritVia: 'theme-preset' | 'html-tag' | 'theme' = hasExplicitPreset
    ? 'theme-preset'
    : HEADING_TAGS.has(tag)
      ? 'html-tag'
      : 'theme'
  const spec = readTypoSpec(theme, basePreset)
  const sourceLabel = presetSourceLabel(basePreset, inheritVia === 'theme' ? 'theme-preset' : inheritVia)

  const isHeadingFamily =
    Boolean(override.fontFamily === 'heading') ||
    (!override.fontFamily &&
      (HEADING_TAGS.has(basePreset || '') ||
        input.widgetType === 'Heading' ||
        input.widgetType === 'DocumentTitle' ||
        input.widgetType === 'PostTitle' ||
        input.widgetType === 'CategoryTitle' ||
        (hasExplicitPreset && HEADING_TAGS.has(override.typography || ''))))

  // --- Font family ---
  let fontFamily: EffectiveTypographyField
  if (override.fontFamily) {
    const name =
      override.fontFamily === 'heading'
        ? typoTokens?.fontFamilyHeading || typoTokens?.fontFamily || 'Heading'
        : typoTokens?.fontFamily || 'Body'
    const short = String(name).split(',')[0].trim()
    fontFamily = field(short, 'Override', 'override', false, override.fontFamily)
  } else if (isHeadingFamily && typoTokens?.fontFamilyHeading) {
    fontFamily = field(
      typoTokens.fontFamilyHeading.split(',')[0].trim(),
      sourceLabel,
      inheritVia === 'theme' ? 'theme' : inheritVia,
      true,
      'heading',
    )
  } else if (typoTokens?.fontFamily) {
    fontFamily = field(
      typoTokens.fontFamily.split(',')[0].trim(),
      inheritVia === 'html-tag' || inheritVia === 'theme-preset' ? sourceLabel : 'Theme',
      inheritVia === 'theme' ? 'theme' : inheritVia,
      true,
      'theme',
    )
  } else {
    fontFamily = unresolved('Theme font unresolved')
  }

  // --- Font weight ---
  let fontWeight: EffectiveTypographyField
  if (override.fontWeight) {
    fontWeight = field(override.fontWeight, 'Override', 'override', false, override.fontWeight)
  } else if (spec?.weight) {
    fontWeight = field(formatWeight(spec.weight)!, sourceLabel, inheritVia, true, spec.weight)
  } else {
    fontWeight = unresolved(`${sourceLabel} weight unresolved`)
  }

  // --- Font size ---
  let fontSize: EffectiveTypographyField
  if (override.fontSize) {
    const sizeSpec = readTypoSpec(theme, override.fontSize)
    if (sizeSpec?.size) {
      fontSize = field(sizeSpec.size, `Override (${override.fontSize.toUpperCase()})`, 'override', false, sizeSpec.size)
    } else {
      fontSize = field(override.fontSize.toUpperCase(), 'Override', 'override', false, override.fontSize)
    }
  } else if (spec?.size) {
    fontSize = field(spec.size, sourceLabel, inheritVia, true, spec.size)
  } else {
    fontSize = unresolved(`${sourceLabel} size unresolved`)
  }

  // --- Color ---
  let color: EffectiveTypographyField
  if (override.colorToken) {
    const resolved = resolveColorToken(override.colorToken, '')
    color = field(
      resolved && resolved !== 'inherit' ? resolved : override.colorToken,
      'Override',
      'override',
      false,
      override.colorToken,
    )
  } else if (spec?.color) {
    color = field(spec.color, sourceLabel, inheritVia, true, spec.color)
  } else if (theme?.tokens?.colors?.text) {
    color = field(theme.tokens.colors.text, 'Theme', 'theme', true, 'text')
  } else {
    color = unresolved('Theme color unresolved')
  }

  // --- Line height ---
  let lineHeight: EffectiveTypographyField
  if (override.lineHeight) {
    const resolved = resolveLineHeight(override.lineHeight)
    lineHeight = field(resolved || override.lineHeight, 'Override', 'override', false, override.lineHeight)
  } else if (spec?.lineHeight) {
    lineHeight = field(spec.lineHeight, sourceLabel, inheritVia, true, spec.lineHeight)
  } else {
    lineHeight = unresolved(`${sourceLabel} line-height unresolved`)
  }

  // --- Letter spacing ---
  let letterSpacing: EffectiveTypographyField
  if (override.letterSpacing) {
    const resolved = resolveLetterSpacing(override.letterSpacing)
    letterSpacing = field(
      resolved || override.letterSpacing,
      'Override',
      'override',
      false,
      override.letterSpacing,
    )
  } else if (spec?.letterSpacing) {
    letterSpacing = field(spec.letterSpacing, sourceLabel, inheritVia, true, spec.letterSpacing)
  } else {
    letterSpacing = field('normal', sourceLabel, inheritVia === 'theme' ? 'theme' : inheritVia, true, 'normal')
  }

  // --- Align ---
  let align: EffectiveTypographyField
  if (override.align) {
    align = field(override.align, 'Override', 'override', false, override.align)
  } else {
    align = field('left', 'Theme', 'theme', true, 'left')
  }

  // --- Font style / decoration / transform (browser defaults when unset) ---
  const fontStyle = override.fontStyle
    ? field(override.fontStyle, 'Override', 'override', false, override.fontStyle)
    : field('normal', 'Theme', 'theme', true, 'normal')
  const textDecoration = override.textDecoration
    ? field(override.textDecoration, 'Override', 'override', false, override.textDecoration)
    : field('none', 'Theme', 'theme', true, 'none')
  const textTransform = override.textTransform
    ? field(override.textTransform, 'Override', 'override', false, override.textTransform)
    : field('none', 'Theme', 'theme', true, 'none')

  return {
    basePreset,
    fontFamily,
    fontWeight,
    fontSize,
    color,
    lineHeight,
    letterSpacing,
    align,
    fontStyle,
    textDecoration,
    textTransform,
  }
}

/** Compact label for debug/tests: `32px (Theme Heading 2)` or `700 (Override)`. */
export function formatEffectiveLabel(field: EffectiveTypographyField): string {
  if (field.unresolved) return `Unresolved (${field.sourceLabel})`
  return `${field.display} (${field.sourceLabel})`
}

/** Placeholder / primary value shown in controls — display only, never raw CSS vars. */
export function formatControlPlaceholder(field: EffectiveTypographyField): string {
  if (field.unresolved) return '—'
  return field.display
}

/**
 * Subtle source chip for inherited theme/tag presets only (e.g. "Theme Heading 2").
 * Hidden for overrides (Reset icon signals that) and generic "Theme" defaults.
 */
export function formatSourceIndicator(field: EffectiveTypographyField): string | null {
  if (field.unresolved) return field.sourceLabel || 'Unresolved'
  if (!field.inherited) return null
  if (/^Theme (Heading|Paragraph) \d+$/i.test(field.sourceLabel)) return field.sourceLabel
  // Legacy short form still accepted during transition.
  if (/^Theme [HhPp]\d$/i.test(field.sourceLabel)) return field.sourceLabel
  return null
}
