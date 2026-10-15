'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { HeaderTopBarTextProps } from './frontend'

export const headerTopBarTextEditor: ComponentConfig<HeaderTopBarTextProps> = {
  label: 'Top Bar Text',
  fields: {
    text: {
      type: 'text',
      label: 'Announcement or Contact Text',
    },
  },
  defaultProps: {
    text: 'Hotline: 0900.000.000 | Email: contact@zyvavu.com',
  },
  render: ({ text }) => {
    return (
      <div style={{ fontSize: '12px', color: '#666', padding: '4px 8px', border: '1px dashed #ccc' }}>
        📢 {text}
      </div>
    )
  },
}
