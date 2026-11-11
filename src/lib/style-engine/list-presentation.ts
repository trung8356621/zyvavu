import type { CSSProperties } from 'react'
import type { IconRef } from '@/lib/icons'
import { resolveColorToken } from './token-resolver'
import { resolveWidgetStyles } from './serializer'
import type {
  BackgroundConfig,
  BorderConfig,
  RadiusConfig,
  SpacingConfig,
  TextAlign,
  TypographyStyleConfig,
  UniversalStyle,
} from './types'

export type ListMarkerMode = 'none' | 'icon' | 'number'

export type MarkerStyleConfig = {
  mode?: ListMarkerMode
  icon?: IconRef | null
  colorToken?: string
  sizeToken?: string | number
  background?: BackgroundConfig
  border?: BorderConfig
  radius?: RadiusConfig
  /** Marker box width token / px */
  widthToken?: string | number
  gapToken?: string
  align?: 'start' | 'center' | 'end'
}

/**
 * Reusable list presentation ownership:
 * A. container (ul/ol) B. item (li) C. marker
 * Chevron (expand/collapse) stays independent of marker.
 */
export type ListPresentationConfig = {
  container?: UniversalStyle
  item?: UniversalStyle
  itemHover?: UniversalStyle
  itemActive?: UniversalStyle
  itemParent?: UniversalStyle
  itemChild?: UniversalStyle
  marker?: MarkerStyleConfig
  /** Expand/collapse chevron — never merged with marker */
  chevron?: UniversalStyle & {
    colorToken?: string
    sizeToken?: string | number
  }
  /** Nested indent step in px → CSS `--zyvavu-list-indent` */
  indentPx?: number
}

export function resolveListContainerStyles(style?: UniversalStyle): CSSProperties {
  const base = resolveWidgetStyles(style)
  return {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    ...base,
  }
}

export function resolveListItemStyles(
  style?: UniversalStyle,
  opts?: { depth?: number },
): CSSProperties {
  const base = resolveWidgetStyles(style)
  const depth = opts?.depth || 0
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 'var(--zyvavu-list-marker-gap, 4px)',
    margin: 0,
    paddingInlineStart: depth > 0 ? `calc(${depth} * var(--zyvavu-list-indent, 16px))` : undefined,
    ...base,
  }
}

export function resolveMarkerBoxStyles(marker?: MarkerStyleConfig): CSSProperties {
  if (!marker || marker.mode === 'none') {
    return { display: 'none' }
  }
  const size =
    typeof marker.sizeToken === 'number'
      ? marker.sizeToken
      : marker.sizeToken
        ? `var(--zyvavu-theme-space-${marker.sizeToken}, ${marker.sizeToken})`
        : 18
  const width =
    typeof marker.widthToken === 'number'
      ? marker.widthToken
      : marker.widthToken
        ? `var(--zyvavu-theme-space-${marker.widthToken}, ${marker.widthToken})`
        : size

  const result: CSSProperties = {
    display: 'inline-flex',
    alignItems: marker.align === 'end' ? 'flex-end' : marker.align === 'start' ? 'flex-start' : 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    width,
    minWidth: width,
    height: size,
    color: marker.colorToken ? resolveColorToken(marker.colorToken) : 'currentColor',
    boxSizing: 'border-box',
  }

  if (marker.background?.colorToken) {
    result.backgroundColor = resolveColorToken(marker.background.colorToken)
  }
  if (marker.border) {
    const w = marker.border.widthToken || 'thin'
    const widthCss =
      w === 'none' ? '0' : w === 'thin' ? '1px' : w === 'medium' ? '2px' : w === 'thick' ? '3px' : w
    result.border = `${widthCss} ${marker.border.style || 'solid'} ${resolveColorToken(marker.border.colorToken, 'currentColor')}`
  }
  if (marker.radius?.radiusToken) {
    const r = marker.radius.radiusToken
    result.borderRadius =
      r === 'none'
        ? '0'
        : r === 'pill'
          ? '999px'
          : `var(--zyvavu-theme-radius-${r}, 6px)`
  }
  if (marker.gapToken) {
    result.marginInlineEnd = `var(--zyvavu-theme-space-${marker.gapToken}, 8px)`
  }
  return result
}

export function resolveChevronStyles(
  chevron?: ListPresentationConfig['chevron'],
): CSSProperties {
  const size =
    typeof chevron?.sizeToken === 'number'
      ? chevron.sizeToken
      : chevron?.sizeToken
        ? `var(--zyvavu-theme-space-${chevron.sizeToken}, ${chevron.sizeToken})`
        : 16
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    width: size,
    height: size,
    color: chevron?.colorToken ? resolveColorToken(chevron.colorToken) : 'currentColor',
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    ...resolveWidgetStyles(chevron),
  }
}

export function mergeItemStateStyles(
  base?: UniversalStyle,
  state?: UniversalStyle,
): UniversalStyle | undefined {
  if (!base && !state) return undefined
  if (!state) return base
  if (!base) return state
  return {
    ...base,
    ...state,
    typography: { ...base.typography, ...state.typography } as TypographyStyleConfig,
    background: state.background || base.background,
    border: state.border || base.border,
    spacing: { ...base.spacing, ...state.spacing } as SpacingConfig,
    colorToken: state.colorToken || base.colorToken,
    align: (state.align || base.align) as TextAlign | undefined,
  }
}
