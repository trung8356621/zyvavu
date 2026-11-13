import React from 'react'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { stripSlideItemMargin } from '@/widgets/BannerSlider/style-targets'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type SlideItemProps = {
  id?: string
  style?: UniversalStyle
  content?: React.ReactNode
  dataContext?: ThemeDataContext
}

export function SlideItemFrontend({
  id: surfaceId,
  style: semanticStyle,
  content,
}: SlideItemProps) {
  const safeStyle = stripSlideItemMargin(semanticStyle)
  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-slide-item"
      {...animationAttributes(safeStyle?.animation)}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        ...resolveWidgetStyles(safeStyle),
        // Margin locked — never apply even from legacy payloads.
        margin: 0,
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
      }}
    >
      {content}
    </div>,
    safeStyle,
    surfaceId,
  )
}
