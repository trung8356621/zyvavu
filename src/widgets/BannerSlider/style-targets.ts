import type { StyleModalDomain } from '@/lib/style-engine/domains'
import type { UniversalStyle } from '@/lib/style-engine/types'

export type BannerSliderStyleTarget = 'bannerItem' | 'arrows' | 'pagination'

export type BannerSliderControlsStyle = {
  arrows?: UniversalStyle
  pagination?: UniversalStyle
}

export const BANNER_SLIDER_STYLE_TARGETS: Array<{
  id: BannerSliderStyleTarget
  label: string
  domains: StyleModalDomain[]
}> = [
  {
    id: 'bannerItem',
    label: 'Banner Item',
    // Same domains as SlideItem; margin remains locked via stripSlideItemMargin.
    domains: ['background', 'spacing', 'borders', 'shadow', 'effects', 'animation'],
  },
  {
    id: 'arrows',
    label: 'Arrows',
    domains: ['background', 'spacing', 'borders', 'typography'],
  },
  {
    id: 'pagination',
    label: 'Pagination',
    domains: ['typography', 'spacing', 'background'],
  },
]

export function getBannerSliderTargetMeta(id: BannerSliderStyleTarget) {
  return BANNER_SLIDER_STYLE_TARGETS.find((t) => t.id === id) || BANNER_SLIDER_STYLE_TARGETS[0]
}

export function readBannerSliderTargetStyle(
  controls: BannerSliderControlsStyle | undefined,
  target: BannerSliderStyleTarget,
): UniversalStyle {
  if (target === 'bannerItem') return {}
  const c = controls || {}
  return { ...(target === 'arrows' ? c.arrows : c.pagination) }
}

export function writeBannerSliderTargetStyle(
  controls: BannerSliderControlsStyle | undefined,
  target: BannerSliderStyleTarget,
  style: UniversalStyle,
): BannerSliderControlsStyle {
  if (target === 'bannerItem') return { ...(controls || {}) }
  const base: BannerSliderControlsStyle = { ...(controls || {}) }
  if (target === 'arrows') return { ...base, arrows: style }
  return { ...base, pagination: style }
}

/** Strip margin from SlideItem styles (UI + runtime + legacy payloads). */
export function stripSlideItemMargin(style?: UniversalStyle): UniversalStyle | undefined {
  if (!style) return style
  const next: UniversalStyle = { ...style }
  if (next.spacing) {
    const { margin: _margin, ...spacingRest } = next.spacing
    next.spacing = spacingRest
    if (!Object.keys(spacingRest).length) delete next.spacing
  }
  if (next.responsive) {
    const responsive = { ...next.responsive }
    for (const bp of ['tablet', 'mobile'] as const) {
      const entry = responsive[bp]
      if (!entry?.spacing) continue
      const { margin: _m, ...spacingRest } = entry.spacing
      responsive[bp] = { ...entry, spacing: Object.keys(spacingRest).length ? spacingRest : undefined }
      if (!responsive[bp]?.spacing && !responsive[bp]?.typography && !responsive[bp]?.align) {
        delete responsive[bp]
      }
    }
    next.responsive = Object.keys(responsive).length ? responsive : undefined
  }
  return next
}
