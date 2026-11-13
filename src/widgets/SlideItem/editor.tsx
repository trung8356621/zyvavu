'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { useWidgetPreviewStyle } from '@/lib/style-engine/preview-store'
import { stripSlideItemMargin } from '@/widgets/BannerSlider/style-targets'
import type { SlideItemProps } from './frontend'

function SlideItemEditorRender({
  id,
  style,
  content: Content,
  puck,
}: {
  id?: string
  style?: SlideItemProps['style']
  content?: React.ComponentType
  puck?: { id?: string; componentId?: string }
}) {
  const previewStyle = useWidgetPreviewStyle(id, puck?.id, puck?.componentId)
  const safeStyle = stripSlideItemMargin(previewStyle || style)
  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-slide-item"
      {...animationAttributes(safeStyle?.animation)}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        minWidth: 0,
        minHeight: 160,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        ...resolveWidgetStyles(safeStyle),
        margin: 0,
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
      }}
    >
      {Content && <Content />}
    </div>,
    safeStyle,
    id,
  )
}

export const slideItemEditor: ComponentConfig<SlideItemProps> = {
  label: 'Slide Item',
  fields: {
    content: {
      type: 'slot',
      disallow: ['Section', 'BannerSlider', 'SlideItem'],
    },
  },
  defaultProps: {
    style: {
      background: { mode: 'color', colorToken: 'surface' },
      spacing: { padding: { token: 'lg' } },
    },
  },
  render: (props) => <SlideItemEditorRender {...props} />,
}
