import React from 'react'
import type { ThemeDataContext, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { resolveColorToken } from '@/lib/theme-engine/page-settings'

export type PostTitleProps = {
  id?: string
  tag?: 'h1' | 'h2' | 'h3'
  align?: 'left' | 'center' | 'right'
  variant?: 'default' | 'accent' | 'subtle'
  style?: WidgetSemanticStyle
  title?: string
  dataContext?: ThemeDataContext
}

export function PostTitleFrontend({
  tag = 'h1',
  align = 'left',
  variant = 'default',
  style: semanticStyle,
  title: customTitle,
  dataContext,
}: PostTitleProps) {
  const title = customTitle || dataContext?.document?.title || 'Untitled Document'
  const effectiveTag = (semanticStyle?.typography?.startsWith('h') ? semanticStyle.typography : tag) as any
  const HeadingTag = effectiveTag || 'h1'
  const effectiveAlign = semanticStyle?.align || align

  const colorStyle = semanticStyle?.colorToken
    ? resolveColorToken(semanticStyle.colorToken)
    : variant === 'accent'
      ? 'var(--zyvavu-theme-primary, var(--zyvavu-primary, #0e6b66))'
      : 'inherit'

  return (
    <div
      className={`zyvavu-widget-post-title zyvavu-widget-post-title--${variant}`}
      style={{
        textAlign: effectiveAlign,
        marginBottom: '1.5rem',
      }}
    >
      <HeadingTag
        className="zyvavu-widget-post-title__heading"
        style={{
          margin: 0,
          color: colorStyle,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </HeadingTag>
    </div>
  )
}
