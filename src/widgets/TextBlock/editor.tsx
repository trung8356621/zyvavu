'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { TextBlockFrontend, type TextBlockProps } from './frontend'

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
    // align → Style Sidebar (typography.align). Prop retained for saved-data compatibility.
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
  render: (props) => <TextBlockFrontend {...props} dataContext={undefined} />,
}
