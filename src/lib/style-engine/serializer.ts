import type { CSSProperties } from 'react'
import { tokenToKebab } from '@/lib/theme-engine/page-settings'
import type { BackgroundConfig, UniversalStyle } from './types'
import {
  resolveBorderWidthToken,
  resolveColorToken,
  resolveContainerWidth,
  resolveLetterSpacing,
  resolveLineHeight,
  resolvePatternCss,
  resolvePatternSize,
  resolveRadiusToken,
  resolveShadowToken,
  resolveSpacingToken,
  resolveTextEffect,
  serializeGradientCss,
  serializeMeshCss,
} from './token-resolver'

export interface SectionResolvedLayers {
  rootStyle: CSSProperties
  baseColorStyle: CSSProperties
  mediaStyle: CSSProperties
  overlayStyle: CSSProperties
  patternStyle: CSSProperties
  containerStyle: CSSProperties
  contentStyle: CSSProperties
  videoConfig?: {
    url?: string
    posterUrl?: string
    loop?: boolean
    muted?: boolean
    autoplay?: boolean
    fallbackImageUrl?: string
  }
}

/** Theme CSS compares each known solid against the two semantic candidates. */
function inheritedForeground(style: UniversalStyle): CSSProperties {
  const bg = style.background
  if (bg?.mode && bg.mode !== 'color') return {}
  if (bg?.gradient || bg?.mesh) return {}
  const token = bg?.colorToken || style.backgroundToken
  if (!token || !/^[a-z][a-z0-9-]*$/i.test(token)) return {}
  const fallback =
    token === 'text'
      ? resolveColorToken('background')
      : token === 'background'
        ? resolveColorToken('text')
        : 'inherit'
  const color = `var(--zyvavu-theme-foreground-on-${tokenToKebab(token)}, ${fallback})`
  return { '--zyvavu-inherited-foreground': color, color } as CSSProperties
}

/**
 * Resolves standard widget styles into a single React CSSProperties object.
 * Used by typography, text, and media widgets on frontend SSR.
 */
export function resolveWidgetStyles(style?: UniversalStyle): CSSProperties {
  if (!style) return {}

  const result: CSSProperties = inheritedForeground(style)
  const preset =
    typeof style.typography === 'string' ? style.typography : style.typography?.typography
  if (preset && /^[a-z][a-z0-9-]*$/i.test(preset)) {
    result.fontSize = `var(--zyvavu-theme-${preset}-size)`
    result.fontWeight = `var(--zyvavu-theme-${preset}-weight)` as CSSProperties['fontWeight']
    result.lineHeight = `var(--zyvavu-theme-${preset}-line-height)`
    result.letterSpacing = `var(--zyvavu-theme-${preset}-letter-spacing, normal)`
    result.fontFamily = preset.startsWith('h')
      ? 'var(--zyvavu-theme-font-heading)'
      : 'var(--zyvavu-theme-font)'
  }

  // 1. Typography
  if (style.typography) {
    const typo = style.typography
    if (typo.colorToken) {
      result.color = resolveColorToken(typo.colorToken)
    }
    if (typo.align) {
      result.textAlign = typo.align
    }
    if (typo.letterSpacing) {
      const ls = resolveLetterSpacing(typo.letterSpacing)
      if (ls) result.letterSpacing = ls
    }
    if (typo.lineHeight) {
      const lh = resolveLineHeight(typo.lineHeight)
      if (lh) result.lineHeight = lh
    }
    if (typo.verticalText) {
      result.writingMode = 'vertical-rl'
    }
    if (typo.effectPreset && typo.effectPreset !== 'none') {
      const fx = resolveTextEffect(typo.effectPreset)
      if (fx.textShadow) result.textShadow = fx.textShadow
      if (fx.WebkitTextStroke) (result as any).WebkitTextStroke = fx.WebkitTextStroke
    }
  }

  // Legacy flat colorToken / align
  if (style.colorToken && !style.typography?.colorToken) {
    result.color = resolveColorToken(style.colorToken)
  }
  if (style.align && !result.textAlign) {
    result.textAlign = style.align
  }

  // 2. Background
  if (style.background) {
    const bg = style.background
    if (bg.mode === 'color' || !bg.mode) {
      if (bg.mesh) {
        const meshCss = serializeMeshCss(bg.mesh)
        if (meshCss) result.backgroundImage = meshCss
      } else if (bg.gradient) {
        const gradCss = serializeGradientCss(bg.gradient)
        if (gradCss) result.backgroundImage = gradCss
      } else if (bg.colorToken) {
        result.backgroundColor = resolveColorToken(bg.colorToken)
      }
    } else if (bg.mode === 'image' && bg.image?.url) {
      result.backgroundImage = `url("${bg.image.url}")`
      result.backgroundPosition = bg.image.position || 'center center'
      result.backgroundSize = bg.image.size || 'cover'
      result.backgroundRepeat = bg.image.repeat || 'no-repeat'
      if (bg.image.fallbackColorToken) {
        result.backgroundColor = resolveColorToken(bg.image.fallbackColorToken)
      }
    }
  }

  // Legacy backgroundToken
  if (style.backgroundToken && !result.backgroundColor && !result.backgroundImage) {
    result.backgroundColor = resolveColorToken(style.backgroundToken)
  }

  // 3. Spacing (object or legacy string)
  if (style.spacing) {
    if (typeof style.spacing === 'string') {
      result.padding = resolveSpacingToken(style.spacing)
    } else {
      const sp = style.spacing
      if (sp.padding?.token) {
        result.padding = resolveSpacingToken(sp.padding.token)
      } else {
        if (sp.padding?.topToken) result.paddingTop = resolveSpacingToken(sp.padding.topToken)
        if (sp.padding?.bottomToken)
          result.paddingBottom = resolveSpacingToken(sp.padding.bottomToken)
        if (sp.padding?.leftToken) result.paddingLeft = resolveSpacingToken(sp.padding.leftToken)
        if (sp.padding?.rightToken) result.paddingRight = resolveSpacingToken(sp.padding.rightToken)
      }

      if (sp.margin?.token) {
        result.margin = resolveSpacingToken(sp.margin.token)
      } else {
        if (sp.margin?.topToken) result.marginTop = resolveSpacingToken(sp.margin.topToken)
        if (sp.margin?.bottomToken) result.marginBottom = resolveSpacingToken(sp.margin.bottomToken)
      }

      if (sp.gapToken) {
        result.gap = resolveSpacingToken(sp.gapToken)
      }
    }
  }

  // 4. Border & Radius (object or legacy string)
  if (style.border && style.border.style && style.border.style !== 'none') {
    const bColor = resolveColorToken(style.border.colorToken, '#dfe5e2')
    const bWidth = resolveBorderWidthToken(style.border.widthToken)
    const bStyle = style.border.style

    if (style.border.side && style.border.side !== 'all') {
      const sideKey = style.border.side
      if (sideKey === 'top') result.borderTop = `${bWidth} ${bStyle} ${bColor}`
      if (sideKey === 'bottom') result.borderBottom = `${bWidth} ${bStyle} ${bColor}`
      if (sideKey === 'left') result.borderLeft = `${bWidth} ${bStyle} ${bColor}`
      if (sideKey === 'right') result.borderRight = `${bWidth} ${bStyle} ${bColor}`
    } else {
      result.border = `${bWidth} ${bStyle} ${bColor}`
    }
  }

  if (style.border?.linked === false) {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const value = style.border.sides?.[side]
      if (value && Object.values(value).some((entry) => entry !== undefined)) {
        const key = `border${side[0].toUpperCase()}${side.slice(1)}` as 'borderTop'
        result[key] =
          value.style === 'none'
            ? 'none'
            : `${resolveBorderWidthToken(value.widthToken)} ${value.style || 'solid'} ${resolveColorToken(value.colorToken, 'currentColor')}`
      }
    }
  }

  if (style.radius) {
    if (typeof style.radius === 'string') {
      result.borderRadius = resolveRadiusToken(style.radius)
    } else if (style.radius.radiusToken) {
      result.borderRadius = resolveRadiusToken(style.radius.radiusToken)
    }
  }
  if (typeof style.radius === 'object' && style.radius.linked === false) {
    for (const corner of ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const) {
      const token = style.radius.corners?.[corner]
      if (token)
        result[
          `border${corner[0].toUpperCase()}${corner.slice(1)}Radius` as 'borderTopLeftRadius'
        ] = resolveRadiusToken(token)
    }
  }
  if (style.shadow?.layers?.length) {
    result.boxShadow = style.shadow.layers
      .map((token) => resolveShadowToken(token))
      .filter(Boolean)
      .join(', ')
  }

  // 5. Shadow
  if (style.shadow?.shadowToken && !style.shadow.layers?.length) {
    result.boxShadow = resolveShadowToken(style.shadow.shadowToken)
  }

  // 6. Effects
  if (style.effects) {
    if (typeof style.effects.opacity === 'number') {
      result.opacity = Math.max(0, Math.min(1, style.effects.opacity))
    }
    if (style.effects.backdropBlur && style.effects.backdropBlur !== 'none') {
      const blurMap = { sm: '4px', md: '8px', lg: '16px' }
      result.backdropFilter = `blur(${blurMap[style.effects.backdropBlur] || '8px'})`
    }
    if (style.effects.blendMode && style.effects.blendMode !== 'normal') {
      result.mixBlendMode = style.effects.blendMode
    }
  }

  // 7. Dimensions
  if (style.dimensions) {
    if (style.dimensions.containerWidth)
      result.maxWidth = resolveContainerWidth(style.dimensions.containerWidth)
    if (style.dimensions.align) result.textAlign = style.dimensions.align
    if (style.dimensions.contentAlign) result.alignItems = style.dimensions.contentAlign
    if (style.dimensions.minHeight) {
      const mh = style.dimensions.minHeight
      if (mh === 'screen') result.minHeight = '100vh'
      else if (mh === 'sm') result.minHeight = '200px'
      else if (mh === 'md') result.minHeight = '400px'
      else if (mh === 'lg') result.minHeight = '600px'
      else if (mh !== 'auto') result.minHeight = mh
    }
  }

  return result
}

/**
 * Resolves Section multi-layer visual presentation styles.
 * Guarantees visual separation:
 * Base Color -> Background Media (Image/Video) -> Overlay / Pattern -> Content
 */
export function resolveSectionLayerStyles(
  style?: UniversalStyle,
  sectionProps?: {
    containerWidth?: string
    pageContainerWidth?: string
    verticalPadding?: string
    minHeight?: string
  },
): SectionResolvedLayers {
  const s = style || {}
  const bg = s.background || {}

  // 1. Root Section style
  const rootStyle: CSSProperties = {
    position: 'relative',
    isolation: 'isolate',
    width: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
    ...inheritedForeground(s),
    ...(s.typography?.colorToken || s.colorToken
      ? { color: resolveColorToken(s.typography?.colorToken || s.colorToken) }
      : {}),
  }

  const verticalPadding = s.section?.verticalPadding || sectionProps?.verticalPadding || 'md'
  if (verticalPadding !== 'none') {
    const padVal = resolveSpacingToken(verticalPadding)
    rootStyle.paddingTop = padVal
    rootStyle.paddingBottom = padVal
  }

  const minHeight =
    s.section?.minHeight || s.dimensions?.minHeight || sectionProps?.minHeight || 'auto'
  if (minHeight === 'screen') {
    rootStyle.minHeight = '100vh'
  } else if (minHeight === 'sm') {
    rootStyle.minHeight = '200px'
  } else if (minHeight === 'md') {
    rootStyle.minHeight = '400px'
  } else if (minHeight === 'lg') {
    rootStyle.minHeight = '600px'
  } else if (minHeight !== 'auto' && minHeight) {
    rootStyle.minHeight = minHeight
  }

  if (s.border?.style && s.border.style !== 'none') {
    const bColor = resolveColorToken(s.border.colorToken, '#dfe5e2')
    const bWidth = resolveBorderWidthToken(s.border.widthToken)
    rootStyle.border = `${bWidth} ${s.border.style} ${bColor}`
  }

  if (s.radius?.radiusToken) {
    rootStyle.borderRadius = resolveRadiusToken(s.radius.radiusToken)
  }

  if (s.shadow?.shadowToken && !s.shadow.layers?.length) {
    rootStyle.boxShadow = resolveShadowToken(s.shadow.shadowToken)
  }

  // 2. Base Color Layer (zIndex 1)
  const baseColorStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none',
  }

  if (bg.mode === 'color' || !bg.mode) {
    if (bg.mesh) {
      const mesh = serializeMeshCss(bg.mesh)
      if (mesh) baseColorStyle.backgroundImage = mesh
    } else if (bg.gradient) {
      const grad = serializeGradientCss(bg.gradient)
      if (grad) baseColorStyle.backgroundImage = grad
    } else if (bg.colorToken) {
      baseColorStyle.backgroundColor = resolveColorToken(bg.colorToken)
    } else if (s.backgroundToken) {
      baseColorStyle.backgroundColor = resolveColorToken(s.backgroundToken)
    }
  } else if (bg.mode === 'image' && bg.image?.fallbackColorToken) {
    baseColorStyle.backgroundColor = resolveColorToken(bg.image.fallbackColorToken)
  } else if (bg.mode === 'video' && bg.video?.fallbackColorToken) {
    baseColorStyle.backgroundColor = resolveColorToken(bg.video.fallbackColorToken)
  }

  // 3. Media Layer (zIndex 2)
  const mediaStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    pointerEvents: 'none',
  }

  if (bg.mode === 'image' && bg.image?.url) {
    mediaStyle.backgroundImage = `url("${bg.image.url}")`
    mediaStyle.backgroundPosition = bg.image.position || 'center center'
    mediaStyle.backgroundSize = bg.image.size || 'cover'
    mediaStyle.backgroundRepeat = bg.image.repeat || 'no-repeat'
  }

  // Poster remains visible when reduced-motion CSS hides the video element.
  if (bg.mode === 'video' && (bg.video?.posterUrl || bg.video?.fallbackImageUrl)) {
    mediaStyle.backgroundImage = `url("${bg.video.posterUrl || bg.video.fallbackImageUrl}")`
    mediaStyle.backgroundSize = 'cover'
    mediaStyle.backgroundPosition = bg.video.position || 'center'
  }
  // Video configuration
  let videoConfig: SectionResolvedLayers['videoConfig'] = undefined
  if (bg.mode === 'video' && bg.video?.url) {
    videoConfig = {
      url: bg.video.url,
      posterUrl: bg.video.posterUrl,
      loop: bg.video.loop !== false,
      muted: true, // Audio autoplay strictly disallowed per master task
      autoplay: bg.video.autoplay !== false,
      fallbackImageUrl: bg.video.fallbackImageUrl,
    }
  }

  // 4. Overlay & Pattern Layer (zIndex 3)
  const overlayStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 3,
    pointerEvents: 'none',
  }

  const overlayColorToken =
    bg.mode === 'image'
      ? bg.image?.overlay?.colorToken
      : bg.mode === 'video'
        ? bg.video?.overlay?.colorToken
        : undefined

  const overlayOpacity =
    bg.mode === 'image'
      ? bg.image?.overlay?.opacity
      : bg.mode === 'video'
        ? bg.video?.overlay?.opacity
        : undefined

  if (overlayColorToken) {
    overlayStyle.backgroundColor = resolveColorToken(overlayColorToken)
    overlayStyle.opacity = typeof overlayOpacity === 'number' ? overlayOpacity : 0.5
  }

  // Pattern layer
  const patternStyle: CSSProperties = {
    borderRadius: 'inherit',
    position: 'absolute',
    inset: 0,
    zIndex: 4,
    pointerEvents: 'none',
  }

  const pattern: BackgroundConfig['pattern'] = bg.pattern || bg.image?.pattern
  const patternPreset = pattern?.preset
  if (patternPreset && patternPreset !== 'none') {
    const patCss = resolvePatternCss(patternPreset)
    if (patCss) {
      const color = resolveColorToken(pattern?.colorToken || 'text')
      const factor = pattern?.scale === 'sm' ? 0.5 : pattern?.scale === 'lg' ? 2 : 1
      patternStyle.backgroundImage = patCss
        .replace(/rgba\(0,\s*0,\s*0,\s*[\d.]+\)/g, color)
        .replace(/([\d.]+)px/g, (_, n) => `${Number(n) * factor}px`)
      patternStyle.color = color
      const pSize = resolvePatternSize(patternPreset)
      if (pSize) {
        patternStyle.backgroundSize = pSize.replace(
          /([\d.]+)px/g,
          (_, n) => `${Number(n) * factor}px`,
        )
      }
      patternStyle.opacity = typeof pattern?.opacity === 'number' ? pattern.opacity : 0.15
    }
  }

  // 5. Container & Content Layer (zIndex 10)
  const rawWidthToken =
    s.section?.containerWidth || s.dimensions?.containerWidth || sectionProps?.containerWidth
  const containerWidthToken =
    !rawWidthToken || rawWidthToken === 'inherit'
      ? sectionProps?.pageContainerWidth || 'containerWidth'
      : rawWidthToken

  const containerStyle: CSSProperties = {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    boxSizing: 'border-box',
    margin: '0 auto',
  }

  if (containerWidthToken === 'full') {
    containerStyle.maxWidth = '100%'
    containerStyle.paddingLeft = 'var(--zyvavu-theme-page-spacing, 24px)'
    containerStyle.paddingRight = 'var(--zyvavu-theme-page-spacing, 24px)'
  } else {
    containerStyle.maxWidth = resolveContainerWidth(containerWidthToken)
    containerStyle.paddingLeft = 'var(--zyvavu-theme-page-spacing, 24px)'
    containerStyle.paddingRight = 'var(--zyvavu-theme-page-spacing, 24px)'
  }

  const contentStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    ...(s.spacing?.gapToken
      ? { display: 'flex', flexDirection: 'column', gap: resolveSpacingToken(s.spacing.gapToken) }
      : {}),
    ...(s.dimensions?.contentAlign
      ? { display: 'flex', flexDirection: 'column', alignItems: s.dimensions.contentAlign }
      : {}),
  }

  const { maxWidth: _containerWidth, ...presentation } = resolveWidgetStyles({
    ...s,
    background: undefined,
    backgroundToken: undefined,
    typography: undefined,
    colorToken: undefined,
  })
  Object.assign(rootStyle, presentation)

  return {
    rootStyle,
    baseColorStyle,
    mediaStyle,
    overlayStyle,
    patternStyle,
    containerStyle,
    contentStyle,
    videoConfig,
  }
}
