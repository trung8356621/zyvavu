'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { PostTitleFrontend, type PostTitleProps } from './frontend'

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
  render: (props) => (
    <PostTitleFrontend
      {...props}
      dataContext={undefined}
      title={props.title || '[Tiêu đề tài liệu]'}
    />
  ),
}
