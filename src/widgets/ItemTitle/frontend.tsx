import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type ItemTitleProps = {
  id?: string

  style?: UniversalStyle
  tag?: 'h2' | 'h3' | 'h4' | 'div'
  linkToPost?: boolean
  className?: string
  dataContext?: ThemeDataContext
}

export function ItemTitleFrontend({
  id: surfaceId,
  style: semanticStyle,
  tag = 'h3',
  linkToPost = true,
  className = '',
  dataContext,
}: ItemTitleProps) {
  const item = dataContext?.item
  const title = item?.title || 'Tiêu đề bài viết mẫu'
  const url = item?.url || '#'

  const Tag = tag as keyof React.JSX.IntrinsicElements

  const content =
    linkToPost && item?.url ? (
      <Link
        href={url}
        className="zyvavu-item-title__link"
        {...animationAttributes(semanticStyle?.animation)}
        style={{
          color: resolveWidgetStyles(semanticStyle).color || 'var(--zyvavu-theme-text, inherit)',
          textDecoration: 'none',
          transition: 'color 0.2s ease',
          ...resolveWidgetStyles({
            typography: semanticStyle?.typography,
            colorToken: semanticStyle?.colorToken,
            align: semanticStyle?.align,
          }),
        }}
      >
        {title}
      </Link>
    ) : (
      title
    )

  return withWidgetStyleSurface(
    <Tag
      className={`zyvavu-item-title ${className}`.trim()}
      style={{
        margin: '0 0 8px 0',
        fontSize: tag === 'h2' ? '1.5rem' : tag === 'h3' ? '1.25rem' : '1.1rem',
        fontWeight: 700,
        lineHeight: 1.35,
        color: 'var(--zyvavu-theme-text, inherit)',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      {content}
    </Tag>,
    semanticStyle,
    surfaceId,
  )
}
