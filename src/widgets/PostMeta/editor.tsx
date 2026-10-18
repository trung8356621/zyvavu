'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { PostMetaFrontend, type PostMetaProps } from './frontend'

export const postMetaEditor: ComponentConfig<PostMetaProps> = {
  label: 'Document Metadata',
  fields: {
    showDate: {
      type: 'radio',
      label: 'Display Date',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showCategories: {
      type: 'radio',
      label: 'Display Category Badges',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    showDate: true,
    showCategories: true,
  },
  render: (props) => (
    <PostMetaFrontend
      {...props}
      dataContext={{
        type: 'single',
        document: { updatedAt: '2026-01-01', categories: [{ title: 'Tin tức' }] },
      }}
    />
  ),
}
