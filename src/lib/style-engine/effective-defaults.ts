import type { ResponsiveConfig, SpacingConfig, UniversalStyle } from './types'
import type { ResponsiveBreakpoint } from './responsive-style'

export const STYLE_DEFAULTS = {
  spacing: 'none',
  width: 'auto',
  minHeight: 'auto',
  border: 'none',
  activeBorderWidth: 'thin',
  radius: 'none',
  background: 'transparent',
  pattern: 'none',
  shadow: 'none',
  opacity: 1,
  animation: 'none',
  transform: 'none',
} as const

export const COLUMNS_LAYOUT_DEFAULTS = { gap: '24px', verticalMargin: '24px' } as const

export type SectionLayoutProps = {
  containerWidth?: string
  pageContainerWidth?: string
  verticalPadding?: string
  minHeight?: string
}

/** Shared by the Section renderer and its Layout controls. */
export function resolveSectionLayout(style: UniversalStyle, props?: SectionLayoutProps) {
  const width = style.section?.containerWidth || style.dimensions?.containerWidth || props?.containerWidth
  const height = style.dimensions?.minHeight
  return {
    containerWidth: !width || width === 'inherit' ? props?.pageContainerWidth || 'containerWidth' : width,
    verticalPadding: style.section?.verticalPadding || props?.verticalPadding || 'md',
    minHeight: height && height !== 'auto'
      ? height
      : style.section?.minHeight || height || props?.minHeight || STYLE_DEFAULTS.minHeight,
  }
}

export function normalizeSpacing(spacing?: SpacingConfig): SpacingConfig {
  return typeof spacing === 'string' ? { padding: { token: spacing } } : spacing || {}
}

/** Match CSS shorthand/longhand precedence without feeding display values back into storage. */
export function resolveSpacingDisplay(
  desktop: SpacingConfig | undefined,
  responsive: ResponsiveConfig | undefined,
  breakpoint: ResponsiveBreakpoint,
  verticalPadding = STYLE_DEFAULTS.spacing as string,
  verticalMargin = STYLE_DEFAULTS.spacing as string,
) {
  const base = normalizeSpacing(desktop)
  const tablet = breakpoint === 'desktop' ? {} : normalizeSpacing(responsive?.tablet?.spacing)
  const mobile = breakpoint === 'mobile' ? normalizeSpacing(responsive?.mobile?.spacing) : {}
  const layers = [mobile, tablet, base]
  const padding = (side: 'topToken' | 'rightToken' | 'bottomToken' | 'leftToken') =>
    layers.map((layer) => layer.padding?.token || layer.padding?.[side]).find(Boolean) ||
    (side === 'topToken' || side === 'bottomToken' ? verticalPadding : STYLE_DEFAULTS.spacing)
  const margin = (side: 'topToken' | 'bottomToken') =>
    layers.map((layer) => layer.margin?.token || layer.margin?.[side]).find(Boolean) || verticalMargin
  const gap = layers.map((layer) => layer.gapToken).find(Boolean)
  return { padding, margin, gap }
}
