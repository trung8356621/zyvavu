'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { FeaturedMediaFrontend, type FeaturedMediaProps } from './frontend'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'

export const featuredMediaEditor: ComponentConfig<FeaturedMediaProps> = {
  label: 'Featured Media',
  fields: {
    aspectRatio: {
      type: 'select',
      label: 'Aspect Ratio',
      options: [
        { label: '16:9 (Widescreen)', value: '16:9' },
        { label: '4:3 (Standard)', value: '4:3' },
        { label: 'Square', value: '1:1' },
        { label: 'Portrait', value: '3:4' },
        { label: '21:9 (Cinematic Banner)', value: '21:9' },
        { label: 'Auto', value: 'auto' },
      ],
    },
    objectFit: {
      type: 'select',
      label: 'Object fit',
      options: [
        { label: 'Cover', value: 'cover' },
        { label: 'Contain', value: 'contain' },
        { label: 'Fill', value: 'fill' },
        { label: 'None', value: 'none' },
      ],
    },
    // rounded → Style Sidebar (radius). Prop retained for saved-data compatibility.
  },
  defaultProps: {
    aspectRatio: '16:9',
    objectFit: 'cover',
    rounded: true,
  },
  render: (props) =>
    props.src ? (
      <FeaturedMediaFrontend {...props} dataContext={undefined} />
    ) : (
      <div
        className="zyvavu-widget-featured-media"
        {...animationAttributes(props.style?.animation)}
        style={{ minHeight: '120px', ...resolveWidgetStyles(props.style) }}
      >
        Featured Media · {props.aspectRatio} · Image loads from the document
      </div>
    ),
}
