'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { CategoryHeaderFrontend, type CategoryHeaderProps } from './frontend'

export const categoryHeaderEditor: ComponentConfig<CategoryHeaderProps> = {
  label: 'Category Archive Header',
  fields: {
    align: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
  },
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
