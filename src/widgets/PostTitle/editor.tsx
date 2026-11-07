'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { documentBoundHeadingFields } from '@/widgets/atoms/heading-fields'
import { PostTitleFrontend, type PostTitleProps } from './frontend'

/**
 * Document Title Fields mirror Heading (HTML Tag + Typography) without Content.
 * Inline/double-click editing is unavailable because there is no text field.
 */
export const postTitleEditor: ComponentConfig<PostTitleProps> = {
  label: 'Document Title',
  fields: {
    ...documentBoundHeadingFields,
  },
  defaultProps: {
    tag: 'h1',
    align: 'left',
    variant: 'default',
    style: {
      typography: { typography: 'h1', colorToken: 'text', align: 'left' },
    },
  },
  render: (props) => (
    <PostTitleFrontend
      {...props}
      dataContext={undefined}
      title={props.title || '[Document Title]'}
    />
  ),
}
