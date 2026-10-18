import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type HeaderActionProps = {
  style?: UniversalStyle
  id?: string
  label?: string
  url?: string
  newTab?: boolean
  variant?: 'solid' | 'outline'
  dataContext?: ThemeDataContext
}

export function HeaderActionFrontend({
  style: semanticStyle,
  label = 'Liên hệ',
  url = '/contact',
  newTab = false,
  variant = 'solid',
}: HeaderActionProps) {
  if (!label || !url) return null

  const isOutline = variant === 'outline'

  return (
    <div className="zyvavu-widget-header-action" style={{ display: 'inline-block' }}>
      <Link
        {...animationAttributes(semanticStyle?.animation)}
        href={url}
        target={newTab ? '_blank' : undefined}
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          backgroundColor: isOutline ? 'transparent' : 'var(--zyvavu-theme-primary, #0e6b66)',
          color: isOutline ? 'var(--zyvavu-theme-primary, #0e6b66)' : '#ffffff',
          border: isOutline ? '1px solid var(--zyvavu-theme-primary, #0e6b66)' : 'none',
          transition: 'all 0.2s ease',
          ...resolveWidgetStyles(semanticStyle),
        }}
      >
        {label}
      </Link>
    </div>
  )
}
