'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { HeaderBrandProps } from './frontend'

export const headerBrandEditor: ComponentConfig<HeaderBrandProps> = {
  label: 'Header Brand / Logo',
  fields: {
    showTagline: {
      type: 'radio',
      label: 'Show Tagline',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    showTagline: true,
  },
  render: ({ showTagline = true }) => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 8px', border: '1px dashed #aaa', borderRadius: '4px' }}>
        <span style={{ fontWeight: 700, fontSize: '16px', color: '#0e6b66' }}>Zyvavu</span>
        {showTagline && <span style={{ fontSize: '11px', color: '#666', borderLeft: '1px solid #ccc', paddingLeft: '6px' }}>Enterprise B2B</span>}
      </div>
    )
  },
}
