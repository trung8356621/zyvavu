import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext, WidgetSemanticStyle } from '@/lib/theme-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { resolveColorToken } from '@/lib/style-engine/token-resolver'

export type TextBlockProps = {
  id?: string
  title?: string
  content?: string
  align?: 'left' | 'center' | 'right'
  badge?: string
  ctaLabel?: string
  ctaUrl?: string
  ctaNewTab?: boolean
  style?: WidgetSemanticStyle
  dataContext?: ThemeDataContext
}

export function TextBlockFrontend({
  title,
  content,
  align = 'left',
  badge,
  ctaLabel,
  ctaUrl,
  ctaNewTab = false,
  style: semanticStyle,
}: TextBlockProps) {
  if (!title && !content && !badge) return null

  const resolved = resolveWidgetStyles(semanticStyle)
  const effectiveAlign = resolved.textAlign || semanticStyle?.align || align
  const titleColor = resolved.color || (semanticStyle?.colorToken ? resolveColorToken(semanticStyle.colorToken) : 'var(--zyvavu-theme-text, inherit)')

  const visualPreset =
    (typeof semanticStyle?.typography === 'object'
      ? semanticStyle.typography?.typography
      : semanticStyle?.typography) || 'h2'

  return (
    <div
      className="zyvavu-widget-text"
      style={{
        textAlign: effectiveAlign,
        padding: resolved.padding || '24px 0',
        borderRadius: resolved.borderRadius,
        backgroundColor: resolved.backgroundColor,
        backgroundImage: resolved.backgroundImage,
        backgroundPosition: resolved.backgroundPosition,
        backgroundSize: resolved.backgroundSize,
        backgroundRepeat: resolved.backgroundRepeat,
        border: resolved.border,
        boxShadow: resolved.boxShadow,
        opacity: resolved.opacity,
        backdropFilter: resolved.backdropFilter,
        boxSizing: 'border-box',
      }}
    >
      {badge ? (
        <span
          className="zyvavu-widget-text__badge"
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: '9999px',
            background: 'var(--zyvavu-theme-surface, #f8faf9)',
            color: 'var(--zyvavu-theme-primary, #0e6b66)',
            border: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
            marginBottom: '12px',
          }}
        >
          {badge}
        </span>
      ) : null}

      {title ? (
        <h2
          className={`zyvavu-widget-text__title zyvavu-typo-preset--${visualPreset}`}
          style={{
            margin: '0 0 16px 0',
            fontSize: `var(--zyvavu-theme-${visualPreset}-size, 2rem)`,
            lineHeight: resolved.lineHeight || `var(--zyvavu-theme-${visualPreset}-line-height, 1.3)`,
            fontWeight: `var(--zyvavu-theme-${visualPreset}-weight, 600)`,
            letterSpacing: resolved.letterSpacing || `var(--zyvavu-theme-${visualPreset}-letter-spacing, normal)`,
            color: titleColor,
            textShadow: resolved.textShadow,
            WebkitTextStroke: (resolved as any).WebkitTextStroke,
            writingMode: resolved.writingMode,
          }}
        >
          {title}
        </h2>
      ) : null}

      {content ? (
        <p
          className="zyvavu-widget-text__content"
          style={{
            margin: '0 0 20px 0',
            lineHeight: 1.7,
            color: 'var(--zyvavu-theme-text-muted, #5f7370)',
            fontSize: '1.05rem',
            whiteSpace: 'pre-line',
          }}
        >
          {content}
        </p>
      ) : null}

      {ctaLabel && ctaUrl ? (
        <Link
          href={ctaUrl}
          target={ctaNewTab ? '_blank' : undefined}
          className="zyvavu-widget-text__cta"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '10px 20px',
            backgroundColor: 'var(--zyvavu-theme-primary, #0e6b66)',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}
