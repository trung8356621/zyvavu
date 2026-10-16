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
    style: {
      align: 'left',
      colorToken: 'text',
      spacing: 'md',
      radius: 'sm',
      backgroundToken: 'surface',
    },
  },
  render: ({ title, content, align = 'left', badge, ctaLabel, style: semanticStyle }) => {
    const effectiveAlign = semanticStyle?.align || align
    const titleColor = semanticStyle?.colorToken
      ? `var(--zyvavu-theme-color-${semanticStyle.colorToken.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()}, var(--zyvavu-theme-${semanticStyle.colorToken}, inherit))`
      : 'inherit'
    const paddingVal = semanticStyle?.spacing ? `var(--zyvavu-theme-spacing-${semanticStyle.spacing}, 16px)` : '16px'
    const radiusVal = semanticStyle?.radius ? `var(--zyvavu-theme-radius-${semanticStyle.radius}, 8px)` : '8px'
    const bgVal = semanticStyle?.backgroundToken
      ? `var(--zyvavu-theme-color-${semanticStyle.backgroundToken.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()}, var(--zyvavu-theme-${semanticStyle.backgroundToken}, transparent))`
      : 'transparent'

    return (
      <div
        className="zyvavu-widget-text"
        style={{
          textAlign: effectiveAlign,
          padding: paddingVal,
          border: '1px solid #e9ecef',
          borderRadius: radiusVal,
          backgroundColor: bgVal,
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
        {title && <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: titleColor }}>{title}</h3>}
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
