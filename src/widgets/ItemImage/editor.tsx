'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { ItemImageFrontend, type ItemImageProps } from './frontend'

export const itemImageEditor: ComponentConfig<ItemImageProps> = {
  label: 'Item Image',
  fields: {
    aspectRatio: {
      type: 'select',
      label: 'Aspect Ratio',
      options: [
        { label: '16:9 Widescreen', value: '16:9' },
        { label: '4:3 Standard', value: '4:3' },
        { label: '1:1 Square', value: '1:1' },
        { label: 'Natural / Auto', value: 'auto' },
      ],
    },
    borderRadius: {
      type: 'text',
      label: 'Border Radius (e.g. 4px, 8px, 0px)',
    },
    linkToPost: {
      type: 'radio',
      label: 'Link to Post/URL',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    aspectRatio: '16:9',
    borderRadius: '4px',
    linkToPost: true,
  },
  render: (props: any) => <ItemImageFrontend {...(props as any)} />,
}
