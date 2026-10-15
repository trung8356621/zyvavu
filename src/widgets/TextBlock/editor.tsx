'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { TextBlockProps } from './frontend'

export const textBlockEditor: ComponentConfig<TextBlockProps> = {
  label: 'Text & Content Card',
  fields: {
    badge: {
      type: 'text',
      label: 'Badge / Eyebrow Text',
    },
    title: {
      type: 'text',
      label: 'Heading Title',
    },
    content: {
      type: 'textarea',
      label: 'Body Text',
    },
    align: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    ctaLabel: {
      type: 'text',
      label: 'Button Label',
    },
    ctaUrl: {
      type: 'text',
      label: 'Button URL',
    },
  },
  defaultProps: {
    title: 'Tiêu đề nội dung khối',
    content: 'Mô tả chi tiết nội dung hiển thị trong khối văn bản này.',
    align: 'left',
    badge: '',
    ctaLabel: '',
    ctaUrl: '',
  },
  render: ({ title, content, align = 'left', badge, ctaLabel }) => {
    return (
      <div
        className="zyvavu-widget-text"
        style={{
          textAlign: align,
          padding: '16px',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          margin: '12px 0',
        }}
      >
        {badge && (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '9999px',
              background: '#eef2f1',
              color: '#0e6b66',
              marginBottom: '8px',
            }}
          >
            {badge}
          </span>
        )}
        {title && <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>{title}</h3>}
        {content && <p style={{ margin: 0, color: '#666', lineHeight: 1.6 }}>{content}</p>}
        {ctaLabel && (
          <div style={{ marginTop: '12px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                background: '#0e6b66',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            >
              {ctaLabel}
            </span>
          </div>
        )}
      </div>
    )
  },
}
