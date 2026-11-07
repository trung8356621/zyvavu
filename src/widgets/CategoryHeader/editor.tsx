'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { CategoryHeaderFrontend, type CategoryHeaderProps } from './frontend'

export const categoryHeaderEditor: ComponentConfig<CategoryHeaderProps> = {
  label: 'Category Archive Header',
  // align → Style Sidebar (typography.align). Prop retained for saved-data compatibility.
  fields: {},
  defaultProps: {
    align: 'left',
  },
  render: (props) => (
    <CategoryHeaderFrontend
      {...props}
      dataContext={undefined}
      title={props.title || '[Tên chuyên mục]'}
    />
  ),
}
