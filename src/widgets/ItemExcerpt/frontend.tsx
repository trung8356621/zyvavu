import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type ItemExcerptProps = {
  id?: string

  style?: UniversalStyle
  maxLines?: number
  className?: string
  dataContext?: ThemeDataContext
}

export function ItemExcerptFrontend({
  id: surfaceId,
  style: semanticStyle,
  maxLines = 3,
  className = '',
  dataContext,
}: ItemExcerptProps) {
  const item = dataContext?.item
  const excerpt =
    item?.excerpt ||
    'Tóm tắt nội dung mô tả chi tiết của bài viết này để hiển thị trên thẻ card xem trước.'

  return withWidgetStyleSurface(
    <p
      className={`zyvavu-item-excerpt ${className}`.trim()}
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        margin: '0 0 12px 0',
        fontSize: '0.95rem',
        lineHeight: 1.6,
        color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text-muted, #64748b))',
        display: '-webkit-box',
        WebkitLineClamp: maxLines || 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      {excerpt}
    </p>,
    semanticStyle,
    surfaceId,
  )
}
