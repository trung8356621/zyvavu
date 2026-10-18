import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type HeaderTopBarTextProps = {
  style?: UniversalStyle
  id?: string
  text?: string
  dataContext?: ThemeDataContext
}

export function HeaderTopBarTextFrontend({
  id: surfaceId,
  style: semanticStyle,
  text = 'Cổng thông tin doanh nghiệp B2B — Hotline: 0900.000.000',
}: HeaderTopBarTextProps) {
  if (!text) return null
  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-topbar-text"
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        fontSize: '13px',
        color: 'var(--zyvavu-theme-text-muted, #5f7370)',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      {text}
    </div>,
    semanticStyle,
    surfaceId,
  )
}
