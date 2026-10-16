'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { ItemLinkFrontend, type ItemLinkProps } from './frontend'

export const itemLinkEditor: ComponentConfig<ItemLinkProps> = {
  label: 'Item Link / CTA',
  fields: {
    label: {
      type: 'text',
      label: 'Button / Link Text',
    },
    variant: {
      type: 'select',
      label: 'Style Variant',
      options: [
        { label: 'Inline Text Link (→)', value: 'link' },
        { label: 'Solid Button', value: 'button' },
        { label: 'Outline Button', value: 'outline' },
      ],
    },
  },
  defaultProps: {
    label: 'Xem chi tiết →',
    variant: 'link',
  },
  render: (props: any) => <ItemLinkFrontend {...(props as any)} />,
}
