import type { CSSProperties } from 'react'
import type { ButtonStyleShell, UniversalStyle } from './types'
import {
  resolveBorderWidthToken,
  resolveColorToken,
  resolveRadiusToken,
  resolveShadowToken,
} from './token-resolver'

export const BUTTON_STYLE_CLASS = 'zyvavu-styled-button'

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
  if (preset === 'outline') {
    return {
      ...base,
      backgroundColor: 'transparent',
      color: resolveColorToken('primary'),
      border: `1px solid ${resolveColorToken('primary')}`,
    }
  }
  if (preset === 'theme') {
    return {
      ...base,
      backgroundColor: resolveColorToken('primary'),
      color: resolveColorToken('background', '#fff'),
      border: '1px solid transparent',
    }
  }
  return base
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
  if (normal.border?.style && normal.border.style !== 'none') {
    result.border = `${resolveBorderWidthToken(normal.border.widthToken)} ${normal.border.style} ${resolveColorToken(normal.border.colorToken, 'currentColor')}`
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
