'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { HeaderActionProps } from './frontend'

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
  render: ({ label = 'Liên hệ', variant = 'solid' }) => {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '6px 14px',
          background: variant === 'solid' ? '#0e6b66' : 'transparent',
          color: variant === 'solid' ? '#fff' : '#0e6b66',
          border: variant === 'outline' ? '1px solid #0e6b66' : 'none',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    )
  },
}
