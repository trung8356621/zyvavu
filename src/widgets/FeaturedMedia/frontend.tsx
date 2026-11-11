import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type FeaturedMediaProps = {
  style?: UniversalStyle
  id?: string
  aspectRatio?: '16:9' | '4:3' | '21:9' | '1:1' | '3:4' | 'auto'
  objectFit?: 'cover' | 'contain' | 'fill' | 'none'
  rounded?: boolean
  src?: string
  alt?: string
  dataContext?: ThemeDataContext
}

export function resolveFeaturedMedia(document?: ThemeDataContext['document']) {
  const media = document?.featuredImage || document?.image || document?.media
  return {
    src: typeof media === 'string' ? media : media?.url,
    alt: (typeof media === 'object' && media?.alt) || document?.title || '',
  }
}

export function FeaturedMediaFrontend({
  id: surfaceId,
  style: semanticStyle,
  aspectRatio = '16:9',
  objectFit = 'cover',
  rounded = true,
  dataContext,
}: FeaturedMediaProps) {
  const { src, alt } = resolveFeaturedMedia(dataContext?.document)

  if (!src) return null

  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-featured-media"
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        width: '100%',
        marginBottom: '24px',
        overflow: 'hidden',
        borderRadius: rounded ? 'var(--zyvavu-theme-radius-md, 8px)' : 0,
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: 'auto',
          aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio.replace(':', '/'),
          objectFit: objectFit || 'cover',
          display: 'block',
        }}
      />
    </div>,
    semanticStyle,
    surfaceId,
  )
}
