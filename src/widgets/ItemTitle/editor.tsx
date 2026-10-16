'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { ItemTitleFrontend, type ItemTitleProps } from './frontend'

export const itemTitleEditor: ComponentConfig<ItemTitleProps> = {
  label: 'Item Title',
  fields: {
    tag: {
      type: 'select',
      label: 'HTML Heading Tag',
      options: [
        { label: 'H2 (Large Heading)', value: 'h2' },
        { label: 'H3 (Medium Heading)', value: 'h3' },
        { label: 'H4 (Small Heading)', value: 'h4' },
        { label: 'DIV (Plain Block)', value: 'div' },
      ],
    },
    linkToPost: {
      type: 'radio',
      label: 'Link to Post/URL',
      options: [
        { label: 'Yes (Clickable Link)', value: true },
        { label: 'No (Plain Text)', value: false },
      ],
    },
  },
  defaultProps: {
    tag: 'h3',
    linkToPost: true,
  },
  render: (props: any) => <ItemTitleFrontend {...(props as any)} />,
}
