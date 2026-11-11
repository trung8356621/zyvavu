'use client'

import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { FeaturedPostProps } from './frontend'

const SAMPLE = {
  title: 'Bài viết nổi bật: Chuyển đổi số doanh nghiệp 2026',
  excerpt:
    'Tóm tắt chiến lược số hóa vận hành và nâng cao trải nghiệm khách hàng trên mọi kênh.',
  date: '15 Thg 10, 2026',
}

export const featuredPostEditor: ComponentConfig<FeaturedPostProps> = {
  label: 'Featured Post',
  fields: {
    mode: {
      type: 'select',
      label: 'Selection Mode',
      options: [
        { label: 'Dynamic — Latest published', value: 'latest' },
        { label: 'Manual — Post ID', value: 'manual' },
      ],
    },
    postId: {
      type: 'text',
      label: 'Post ID (manual mode)',
    },
    preset: {
      type: 'select',
      label: 'Visual Preset',
      options: [
        { label: 'Spotlight (image above)', value: 'spotlight' },
        { label: 'Horizontal (image + copy)', value: 'horizontal' },
        { label: 'Minimal (text only)', value: 'minimal' },
      ],
    },
    showImage: {
      type: 'radio',
      label: 'Featured Image',
      options: [
        { label: 'Show', value: true },
        { label: 'Hide', value: false },
      ],
    },
    showExcerpt: {
      type: 'radio',
      label: 'Excerpt',
      options: [
        { label: 'Show', value: true },
        { label: 'Hide', value: false },
      ],
    },
    showDate: {
      type: 'radio',
      label: 'Publish Date',
      options: [
        { label: 'Show', value: true },
        { label: 'Hide', value: false },
      ],
    },
    emptyText: { type: 'text', label: 'Empty State Message' },
  },
  defaultProps: {
    mode: 'latest',
    postId: '',
    preset: 'spotlight',
    showImage: true,
    showExcerpt: true,
    showDate: true,
    emptyText: 'Chưa có bài viết nổi bật.',
  },
  render: ({
    id: surfaceId,
    style: semanticStyle,
    mode = 'latest',
    preset = 'spotlight',
    showImage = true,
    showExcerpt = true,
    showDate = true,
    postId = '',
  }) =>
    withWidgetStyleSurface(
      <div
        className="zyvavu-widget-featured-post zyvavu-widget-featured-post--editor"
        {...animationAttributes(semanticStyle?.animation)}
        style={{
          padding: 16,
          border: '1px dashed #cbd5e1',
          borderRadius: 8,
          margin: '12px 0',
          ...resolveWidgetStyles(semanticStyle),
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0e6b66', marginBottom: 12 }}>
          Featured Post · {mode === 'manual' ? `Manual #${postId || '…'}` : 'Latest'} · {preset}
        </div>
        <div
          style={{
            display: preset === 'horizontal' ? 'grid' : 'flex',
            gridTemplateColumns: preset === 'horizontal' ? '1fr 1fr' : undefined,
            flexDirection: preset === 'horizontal' ? undefined : 'column',
            gap: 16,
          }}
        >
          {showImage && preset !== 'minimal' && (
            <div
              style={{
                height: preset === 'horizontal' ? 140 : 160,
                borderRadius: 8,
                background: '#e2e8f0',
              }}
            />
          )}
          <div>
            {showDate && (
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{SAMPLE.date}</div>
            )}
            <h3 style={{ margin: '0 0 8px', fontSize: preset === 'minimal' ? 16 : 20 }}>
              {SAMPLE.title}
            </h3>
            {showExcerpt && (
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>{SAMPLE.excerpt}</p>
            )}
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0e6b66' }}>Đọc bài viết →</span>
          </div>
        </div>
      </div>,
      semanticStyle,
      surfaceId,
    ),
}
