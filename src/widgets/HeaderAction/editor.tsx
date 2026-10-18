'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { HeaderActionFrontend, type HeaderActionProps } from './frontend'

export const headerActionEditor: ComponentConfig<HeaderActionProps> = {
  label: 'Header Action Button',
  fields: {
    label: {
      type: 'text',
      label: 'Button Text',
    },
    url: {
      type: 'text',
      label: 'Target URL',
    },
    variant: {
      type: 'select',
      label: 'Style Variant',
      options: [
        { label: 'Solid Brand Color', value: 'solid' },
        { label: 'Outline Border', value: 'outline' },
      ],
    },
  },
  defaultProps: {
    label: 'Liên hệ',
    url: '/contact',
    variant: 'solid',
  },
  render: (props) => <HeaderActionFrontend {...props} dataContext={undefined} />,
}
