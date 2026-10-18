import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type FeaturedMediaProps = {
  style?: UniversalStyle
  id?: string
  aspectRatio?: '16:9' | '4:3' | '21:9' | 'auto'
  rounded?: boolean
  src?: string
  alt?: string
  dataContext?: ThemeDataContext
}

export function FeaturedMediaFrontend({
  id: surfaceId,
  style: semanticStyle,
  aspectRatio = '16:9',
  rounded = true,
  src: customSrc,
  alt: customAlt,
  dataContext,
}: FeaturedMediaProps) {
  const doc = dataContext?.document
  const mediaObj = doc?.featuredImage || doc?.image || doc?.media
  const src =
    customSrc ||
    (typeof mediaObj === 'object' && mediaObj?.url) ||
    (typeof mediaObj === 'string' ? mediaObj : null)
  const alt = customAlt || (typeof mediaObj === 'object' && mediaObj?.alt) || doc?.title || ''

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
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>,
    semanticStyle,
    surfaceId,
  )
}
