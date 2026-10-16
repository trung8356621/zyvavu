'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { ItemExcerptFrontend, type ItemExcerptProps } from './frontend'

export const itemExcerptEditor: ComponentConfig<ItemExcerptProps> = {
  label: 'Item Excerpt',
  fields: {
    maxLines: {
      type: 'number',
      label: 'Max Lines to Display',
      min: 1,
      max: 10,
    },
  },
  defaultProps: {
    maxLines: 3,
  },
  render: (props: any) => <ItemExcerptFrontend {...(props as any)} />,
}
