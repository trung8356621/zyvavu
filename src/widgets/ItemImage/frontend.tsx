import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type ItemImageProps = {
  id?: string

  style?: UniversalStyle
  aspectRatio?: '16:9' | '4:3' | '1:1' | 'auto'
  borderRadius?: string
  linkToPost?: boolean
  className?: string
  dataContext?: ThemeDataContext
}

export function ItemImageFrontend({
  id: surfaceId,
  style: semanticStyle,
  aspectRatio = '16:9',
  borderRadius = '4px',
  linkToPost = true,
  className = '',
  dataContext,
}: ItemImageProps) {
  const item = dataContext?.item
  const imageUrl = item?.image?.url
  const imageAlt = item?.image?.alt || item?.title || 'Item image'
  const postUrl = item?.url || '#'

  const ratioMap = {
    '16:9': '56.25%',
    '4:3': '75%',
    '1:1': '100%',
    auto: 'auto',
  }
  const paddingBottom = ratioMap[aspectRatio] || '56.25%'

  const imageElement = imageUrl ? (
    <img
      src={imageUrl}
      alt={imageAlt}
      style={{
        position: aspectRatio === 'auto' ? 'static' : 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
      }}
    />
  ) : (
    <div
      style={{
        position: aspectRatio === 'auto' ? 'static' : 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--zyvavu-theme-surface, #f1f5f9)',
        color: 'var(--zyvavu-theme-text-muted, #94a3b8)',
        fontSize: '13px',
      }}
    >
      <span>🖼️ {item?.title ? item.title.slice(0, 24) : 'Hình ảnh'}</span>
    </div>
  )

  const wrapped = (
    <div
      className={`zyvavu-item-image ${className}`.trim()}
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: aspectRatio === 'auto' ? undefined : paddingBottom,
        overflow: 'hidden',
        borderRadius: borderRadius || '4px',
        backgroundColor: '#e2e8f0',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      {imageElement}
    </div>
  )

  const surface = withWidgetStyleSurface(wrapped, semanticStyle, surfaceId)
  if (linkToPost && item?.url) {
    return (
      <Link href={postUrl} style={{ display: 'block', textDecoration: 'none' }}>
        {surface}
      </Link>
    )
  }
  return surface
}
