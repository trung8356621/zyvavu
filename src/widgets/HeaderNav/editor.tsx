'use client'

import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { HeaderNavProps } from './frontend'

export const headerNavEditor: ComponentConfig<HeaderNavProps> = {
  label: 'Header Navigation Menu',
  fields: {
    dropdownEffect: {
      type: 'select',
      label: 'Dropdown Transition Effect',
      options: [
        { label: 'Fade', value: 'fade' },
        { label: 'Slide Down', value: 'slide-down' },
        { label: 'None', value: 'none' },
      ],
    },
  },
  defaultProps: {
    dropdownEffect: 'fade',
  },
  render: ({ style: surfaceStyle, id: surfaceId, dropdownEffect = 'fade' }) => {
    return withWidgetStyleSurface(
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '6px 12px',
          border: '1px dashed #ced4da',
          borderRadius: '4px',
          fontSize: '14px',
        }}
      >
        <span style={{ fontWeight: 600, color: '#0e6b66' }}>[Header Menu]</span>
        <span>Trang chủ</span>
        <span>Sản phẩm ▾</span>
        <span>Giới thiệu</span>
        <span>Tin tức</span>
        <span>Liên hệ</span>
      </div>,
      surfaceStyle,
      surfaceId,
    )
  },
}
