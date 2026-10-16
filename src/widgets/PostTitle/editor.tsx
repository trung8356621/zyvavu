'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { PostTitleProps } from './frontend'

export const postTitleEditor: ComponentConfig<PostTitleProps> = {
  label: 'Document Title',
  fields: {
    tag: {
      type: 'select',
      label: 'HTML Tag',
      options: [
        { label: 'H1 (Main Heading)', value: 'h1' },
        { label: 'H2 (Sub Heading)', value: 'h2' },
        { label: 'H3 (Section Heading)', value: 'h3' },
      ],
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
    variant: {
      type: 'select',
      label: 'Style Variant',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Accent Brand Color', value: 'accent' },
        { label: 'Subtle', value: 'subtle' },
      ],
    },
  },
  defaultProps: {
    tag: 'h1',
    align: 'left',
    variant: 'default',
    style: {
      typography: 'h1',
      colorToken: 'text',
      align: 'left',
    },
  },
  render: ({ tag = 'h1', align = 'left', variant = 'default', style: semanticStyle }) => {
    const effectiveTag = (semanticStyle?.typography?.startsWith('h') ? semanticStyle.typography : tag) as any
    const HeadingTag = effectiveTag || 'h1'
    const effectiveAlign = semanticStyle?.align || align
    const colorStyle = semanticStyle?.colorToken
      ? `var(--zyvavu-theme-color-${semanticStyle.colorToken.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()}, var(--zyvavu-theme-${semanticStyle.colorToken}, inherit))`
      : variant === 'accent'
        ? 'var(--zyvavu-theme-primary, var(--zyvavu-primary, #0e6b66))'
        : 'inherit'

    return (
      <div
        className={`zyvavu-widget-post-title zyvavu-widget-post-title--${variant}`}
        style={{
          textAlign: effectiveAlign,
          padding: '16px 0',
          borderBottom: '1px dashed #dfe5e2',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>
          Dynamic Document Title ({String(effectiveTag).toUpperCase()})
          {semanticStyle?.colorToken ? ` • Token: ${semanticStyle.colorToken}` : ''}
        </div>
        <HeadingTag
          style={{
            margin: 0,
            color: colorStyle,
          }}
        >
          [Tiêu đề tài liệu / Bài viết thực tế]
        </HeadingTag>
      </div>
    )
  },
}
