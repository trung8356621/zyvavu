'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { PostContentFrontend, type PostContentProps } from './frontend'

export const postContentEditor: ComponentConfig<PostContentProps> = {
  label: 'Document Body Content',
  fields: {
    showExcerptFirst: {
      type: 'radio',
      label: 'Show Excerpt / Lead Paragraph First',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    showExcerptFirst: false,
  },
  render: (props) => (
    <PostContentFrontend
      {...props}
      dataContext={{ type: 'single', document: { excerpt: '[Nội dung tài liệu]' } }}
    />
  ),
}
