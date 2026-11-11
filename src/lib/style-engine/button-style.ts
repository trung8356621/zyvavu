import type { CSSProperties } from 'react'
import type { ButtonStyleShell, UniversalStyle } from './types'
import {
  resolveBorderWidthToken,
  resolveColorToken,
  resolveRadiusToken,
  resolveShadowToken,
} from './token-resolver'

export const BUTTON_STYLE_CLASS = 'zyvavu-styled-button'

export const BUTTON_PRESET_DEFAULTS = {
  theme: { backgroundToken: 'primary', textToken: 'background', borderToken: undefined },
  outline: { backgroundToken: undefined, textToken: 'primary', borderToken: 'primary' },
} as const

/** Supported Normal groups for Button Design V1. Icon stays shell-only. */
export const BUTTON_NORMAL_SUPPORTED = [
  'Background',
  'Text',
  'Border',
  'Radius',
  'Shadow',
] as const

/** Supported Hover groups for Button Design V1. */
export const BUTTON_HOVER_SUPPORTED = [
  'Background',
  'Text',
  'Border',
  'Shadow',
  'Layout',
] as const

function emptyShell(): ButtonStyleShell {
  return { version: 1 }
}

/** Normalize legacy / partial button shells. */
export function normalizeButtonStyle(button?: ButtonStyleShell | null): ButtonStyleShell {
  if (!button || button.version !== 1) return emptyShell()
  return {
    version: 1,
    ...(button.normal ? { normal: button.normal } : {}),
    ...(button.hover ? { hover: button.hover } : {}),
  }
}

function applyPreset(preset: 'theme' | 'outline' | undefined, base: CSSProperties): CSSProperties {
  if (!preset) return base
  const defaults = BUTTON_PRESET_DEFAULTS[preset]
  return {
    ...base,
    backgroundColor: defaults.backgroundToken ? resolveColorToken(defaults.backgroundToken) : 'transparent',
    color: resolveColorToken(defaults.textToken, preset === 'theme' ? '#fff' : undefined),
    border: `1px solid ${defaults.borderToken ? resolveColorToken(defaults.borderToken) : 'transparent'}`,
  }
}

/**
 * Resolve Normal button appearance into inline CSS.
 * Widget-level typography/colorToken still apply via resolveWidgetStyles.
 */
export function resolveButtonNormalStyles(button?: ButtonStyleShell | null): CSSProperties {
  const shell = normalizeButtonStyle(button)
  const normal = shell.normal
  if (!normal) return {}

  let result: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background-color 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease, transform 160ms ease',
  }
  result = applyPreset(normal.preset, result)

  if (normal.background?.colorToken) {
    result.backgroundColor = resolveColorToken(normal.background.colorToken)
  }
  if (normal.text?.colorToken) {
    result.color = resolveColorToken(normal.text.colorToken)
  }
  const preset = normal.preset && BUTTON_PRESET_DEFAULTS[normal.preset]
  const borderStyle = normal.border?.style || (preset ? 'solid' : undefined)
  if (borderStyle && normal.border && Object.values(normal.border).some(Boolean)) {
    const borderColor = normal.border.colorToken || (!normal.border.style ? preset?.borderToken : undefined)
    result.border = borderStyle === 'none'
      ? 'none'
      : `${resolveBorderWidthToken(normal.border.widthToken)} ${borderStyle} ${resolveColorToken(borderColor, !normal.border.style && preset ? 'transparent' : 'currentColor')}`
  }
  if (normal.radius?.radiusToken) {
    result.borderRadius = resolveRadiusToken(normal.radius.radiusToken)
  }
  if (normal.shadow?.shadowToken) {
    result.boxShadow = resolveShadowToken(normal.shadow.shadowToken)
  }
  return result
}

/** CSS custom properties consumed by `.zyvavu-styled-button:hover`. */
export function resolveButtonHoverCssVars(
  button?: ButtonStyleShell | null,
): Record<string, string> {
  const hover = normalizeButtonStyle(button).hover
  if (!hover) return {}
  const vars: Record<string, string> = {}
  if (hover.background?.colorToken) {
    vars['--zyvavu-btn-hover-bg'] = resolveColorToken(hover.background.colorToken)
  }
  if (hover.text?.colorToken) {
    vars['--zyvavu-btn-hover-color'] = resolveColorToken(hover.text.colorToken)
  }
  if (hover.border?.colorToken) {
    vars['--zyvavu-btn-hover-border'] = resolveColorToken(hover.border.colorToken)
  }
  if (hover.shadow?.shadowToken) {
    vars['--zyvavu-btn-hover-shadow'] = resolveShadowToken(hover.shadow.shadowToken) || 'none'
  }
  if (typeof hover.opacity === 'number') {
    vars['--zyvavu-btn-hover-opacity'] = String(Math.max(0, Math.min(1, hover.opacity)))
  }
  if (hover.transform === 'lift') vars['--zyvavu-btn-hover-transform'] = 'translateY(-3px)'
  else if (hover.transform === 'grow') vars['--zyvavu-btn-hover-transform'] = 'scale(1.015)'
  else if (hover.transform === 'none') vars['--zyvavu-btn-hover-transform'] = 'none'
  return vars
}

export function buttonHasHoverStyles(button?: ButtonStyleShell | null): boolean {
  return Object.keys(resolveButtonHoverCssVars(button)).length > 0
}

/** Merge widget styles + button normal/hover into props for Button roots. */
export function resolveButtonElementProps(style?: UniversalStyle): {
  className?: string
  style: CSSProperties
} {
  const base = resolveButtonNormalStyles(style?.button)
  const hoverVars = resolveButtonHoverCssVars(style?.button)
  const hasHover = Object.keys(hoverVars).length > 0
  return {
    className: hasHover || style?.button?.normal ? BUTTON_STYLE_CLASS : undefined,
    style: {
      ...base,
      ...hoverVars,
    },
  }
}
