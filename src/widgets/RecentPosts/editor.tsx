'use client'

import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { RecentPostsProps } from './frontend'

export const recentPostsEditor: ComponentConfig<RecentPostsProps> = {
  label: 'Recent Posts Grid',
  fields: {
    heading: {
      type: 'text',
      label: 'Section Heading',
    },
    limit: {
      type: 'number',
      label: 'Number of Posts (SSR Bounded)',
      min: 1,
      max: 24,
    },
    columns: {
      type: 'select',
      label: 'Columns',
      options: [
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 },
      ],
    },
  },
  defaultProps: {
    heading: 'Bài Viết Mới Nhất',
    limit: 6,
    columns: 3,
  },
  render: ({ style: semanticStyle, heading = 'Bài Viết Mới Nhất', columns = 3 }) => {
    return (
      <div
        className="zyvavu-widget-recent-posts"
        {...animationAttributes(semanticStyle?.animation)}
        style={{
          padding: '16px',
          border: '1px dashed #ced4da',
          borderRadius: '8px',
          margin: '16px 0',
          ...resolveWidgetStyles(semanticStyle),
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', color: '#0e6b66' }}>{heading}</h3>
        <div
          style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '16px' }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ border: '1px solid #e9ecef', borderRadius: '6px', padding: '12px' }}
            >
              <span style={{ fontSize: '11px', color: '#888' }}>15 Tháng Mười, 2026</span>
              <h4 style={{ margin: '6px 0', fontSize: '14px' }}>
                Bài viết mẫu #{i} - Tối ưu hóa website
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                Mô tả tóm tắt nội dung bài viết hiển thị trên lưới bài viết...
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  },
}
