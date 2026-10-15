'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { FeaturedMediaProps } from './frontend'

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
  render: ({ aspectRatio = '16:9', rounded = true }) => {
    return (
      <div
        className="zyvavu-widget-featured-media"
        style={{
          width: '100%',
          aspectRatio: aspectRatio === 'auto' ? '16/9' : aspectRatio.replace(':', '/'),
          backgroundColor: '#e8eeea',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: rounded ? '8px' : 0,
          border: '1px dashed #0e6b66',
          marginBottom: '16px',
          color: '#0e6b66',
        }}
      >
        <span style={{ fontSize: '28px', marginBottom: '8px' }}>🖼️</span>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>Featured Media Slot ({aspectRatio})</span>
        <span style={{ fontSize: '11px', color: '#666' }}>Automatically loads featured image from post or page document</span>
      </div>
    )
  },
}
