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
        { label: '21:9 (Cinematic Banner)', value: '21:9' },
        { label: 'Auto', value: 'auto' },
      ],
    },
    rounded: {
      type: 'radio',
      label: 'Rounded Corners',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    aspectRatio: '16:9',
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
