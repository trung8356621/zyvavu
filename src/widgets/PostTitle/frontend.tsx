import React from 'react'
import type { ThemeDataContext, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { resolveColorToken } from '@/lib/style-engine/token-resolver'

export type PostTitleProps = {
  id?: string
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  align?: 'left' | 'center' | 'right'
  variant?: 'default' | 'accent' | 'subtle'
  style?: WidgetSemanticStyle
  title?: string
  dataContext?: ThemeDataContext
}

export function PostTitleFrontend({
  tag,
  align = 'left',
  variant = 'default',
  style: semanticStyle,
  title: customTitle,
  dataContext,
}: PostTitleProps) {
  const title = customTitle || dataContext?.document?.title || 'Untitled Document'

  // Visual typography preset from Style Engine
  const visualPreset =
    (typeof semanticStyle?.typography === 'object'
      ? semanticStyle.typography?.typography
      : semanticStyle?.typography) || 'h1'

  // Independent Semantic HTML tag from Widget Settings (with fallback to visual heading preset or 'h1')
  const HeadingTag = (
    tag ||
    (typeof visualPreset === 'string' && visualPreset.startsWith('h') ? visualPreset : 'h1')
  ) as keyof React.JSX.IntrinsicElements

  const resolved = resolveWidgetStyles(semanticStyle)
  const effectiveAlign = resolved.textAlign || semanticStyle?.align || align

  const defaultColor =
    variant === 'accent'
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
        className={`zyvavu-widget-post-title__heading zyvavu-typo-preset--${visualPreset}`}
        style={{
          margin: 0,
          color: resolved.color || defaultColor,
          fontSize: `var(--zyvavu-theme-${visualPreset}-size, var(--zyvavu-theme-h1-size, 44px))`,
          lineHeight: resolved.lineHeight || `var(--zyvavu-theme-${visualPreset}-line-height, 1.2)`,
          fontWeight: `var(--zyvavu-theme-${visualPreset}-weight, 700)`,
          letterSpacing: resolved.letterSpacing || `var(--zyvavu-theme-${visualPreset}-letter-spacing, normal)`,
          writingMode: resolved.writingMode,
          textShadow: resolved.textShadow,
          WebkitTextStroke: (resolved as any).WebkitTextStroke,
        }}
      >
        {title}
      </HeadingTag>
    </div>
  )
}
