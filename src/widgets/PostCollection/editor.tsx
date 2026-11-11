'use client'

import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { PostCollectionProps } from './frontend'

export const postCollectionEditor: ComponentConfig<PostCollectionProps> = {
  label: 'Post Collection',
  fields: {
    heading: { type: 'text', label: 'Section Heading' },
    categoryIds: {
      type: 'textarea',
      label: 'Categories (slugs or IDs, comma/newline separated)',
    },
    includeDescendants: {
      type: 'radio',
      label: 'Include descendant categories',
      options: [
        { label: 'No', value: false },
        { label: 'Yes (when hierarchy exists)', value: true },
      ],
    },
    sort: {
      type: 'select',
      label: 'Sort',
      options: [
        { label: 'Newest First', value: 'newest' },
        { label: 'Oldest First', value: 'oldest' },
        { label: 'Title A–Z', value: 'title-asc' },
        { label: 'Title Z–A', value: 'title-desc' },
      ],
    },
    limit: { type: 'number', label: 'Post Limit (1–24)', min: 1, max: 24 },
    preset: {
      type: 'select',
      label: 'Post Card Preset',
      options: [
        { label: 'Classic List', value: 'classic-list' },
        { label: 'Image Card Grid', value: 'image-card-grid' },
        { label: 'Compact List', value: 'compact-list' },
      ],
    },
    layout: {
      type: 'select',
      label: 'Layout (grid presets)',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
      ],
    },
    columns: {
      type: 'select',
      label: 'Desktop Columns',
      options: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
    },
    columnsTablet: {
      type: 'select',
      label: 'Tablet Columns',
      options: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
      ],
    },
    columnsMobile: {
      type: 'select',
      label: 'Mobile Columns',
      options: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
      ],
    },
    gap: {
      type: 'select',
      label: 'Gap',
      options: [
        { label: '12px', value: '12px' },
        { label: '16px', value: '16px' },
        { label: '24px', value: '24px' },
        { label: '32px', value: '32px' },
      ],
    },
    emptyText: { type: 'text', label: 'Empty State Message' },
  },
  defaultProps: {
    heading: 'Bài viết',
    categoryIds: '',
    includeDescendants: false,
    sort: 'newest',
    limit: 6,
    layout: 'grid',
    columns: 3,
    columnsTablet: 2,
    columnsMobile: 1,
    gap: '24px',
    preset: 'image-card-grid',
    emptyText: 'Chưa có bài viết nào.',
  },
  render: ({
    id: surfaceId,
    style: semanticStyle,
    heading = 'Bài viết',
    preset = 'image-card-grid',
    columns = 3,
  }) => {
    const isList = preset === 'classic-list' || preset === 'compact-list'
    return withWidgetStyleSurface(
      <div
        className="zyvavu-widget-post-collection zyvavu-widget-post-collection--editor"
        {...animationAttributes(semanticStyle?.animation)}
        style={{
          padding: 16,
          border: '1px dashed #cbd5e1',
          borderRadius: 8,
          margin: '12px 0',
          ...resolveWidgetStyles(semanticStyle),
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0e6b66', marginBottom: 8 }}>
          Post Collection · {preset}
        </div>
        <h3 style={{ margin: '0 0 12px' }}>{heading}</h3>
        <div
          style={{
            display: isList ? 'flex' : 'grid',
            flexDirection: isList ? 'column' : undefined,
            gridTemplateColumns: isList ? undefined : `repeat(${Math.min(columns, 3)}, 1fr)`,
            gap: 12,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: preset === 'compact-list' ? '8px 0' : 12,
                display: preset === 'classic-list' ? 'grid' : 'block',
                gridTemplateColumns: preset === 'classic-list' ? '72px 1fr' : undefined,
                gap: 10,
              }}
            >
              {preset !== 'compact-list' && (
                <div
                  style={{
                    height: preset === 'classic-list' ? 56 : 80,
                    background: '#e2e8f0',
                    borderRadius: 4,
                    marginBottom: preset === 'classic-list' ? 0 : 8,
                  }}
                />
              )}
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>15 Thg 10, 2026</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Bài viết mẫu #{i}</div>
              </div>
            </div>
          ))}
        </div>
      </div>,
      semanticStyle,
      surfaceId,
    )
  },
}
