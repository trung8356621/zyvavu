import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type ItemLinkProps = {
  id?: string

  style?: UniversalStyle
  label?: string
  variant?: 'link' | 'button' | 'outline'
  className?: string
  dataContext?: ThemeDataContext
}

export function ItemLinkFrontend({
  id: surfaceId,
  style: semanticStyle,
  label = 'Xem chi tiết →',
  variant = 'link',
  className = '',
  dataContext,
}: ItemLinkProps) {
  const item = dataContext?.item
  const url = item?.url || '#'

  if (variant === 'button') {
    return withWidgetStyleSurface(
      <Link
        href={url}
        className={`zyvavu-item-link zyvavu-item-link--btn ${className}`.trim()}
        {...animationAttributes(semanticStyle?.animation)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 16px',
          borderRadius: '4px',
          background: 'var(--zyvavu-theme-primary, #0e6b66)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.875rem',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
          ...resolveWidgetStyles(semanticStyle),
        }}
      >
        {label}
      </Link>,
      semanticStyle,
      surfaceId,
    )
  }

  if (variant === 'outline') {
    return withWidgetStyleSurface(
      <Link
        href={url}
        className={`zyvavu-item-link zyvavu-item-link--outline ${className}`.trim()}
        {...animationAttributes(semanticStyle?.animation)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 16px',
          borderRadius: '4px',
          border: '1px solid var(--zyvavu-theme-border, #cbd5e1)',
          color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text, inherit))',
          fontWeight: 600,
          fontSize: '0.875rem',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
          ...resolveWidgetStyles(semanticStyle),
        }}
      >
        {label}
      </Link>,
      semanticStyle,
      surfaceId,
    )
  }

  return withWidgetStyleSurface(
    <Link
      href={url}
      className={`zyvavu-item-link ${className}`.trim()}
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        color: 'var(--zyvavu-theme-primary, #0e6b66)',
        fontWeight: 600,
        fontSize: '0.9rem',
        textDecoration: 'none',
        transition: 'color 0.2s ease',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      {label}
    </Link>,
    semanticStyle,
    surfaceId,
  )
}
