'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { FooterProps } from './frontend'

export const footerEditor: ComponentConfig<FooterProps> = {
  label: 'Site Footer',
  fields: {
    copyright: {
      type: 'text',
      label: 'Copyright Notice',
    },
    showBrand: {
      type: 'radio',
      label: 'Show Site Name / Brand',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    footerContent: { type: 'slot' },
  },
  defaultProps: {
    copyright: '© 2026 Zyvavu. All rights reserved.',
    showBrand: true,
  },
  render: ({ copyright = '© 2026 Zyvavu', showBrand = true, footerContent: Content }: any) => {
    return (
      <div
        className="zyvavu-widget-footer"
        style={{
          border: '1px solid #ced4da',
          borderRadius: '8px',
          background: '#f8f9fa',
          padding: '24px',
          margin: '16px 0',
        }}
      >
        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#0e6b66', fontWeight: 600, marginBottom: '12px' }}>
          Free Footer Builder Area
        </div>
        <div style={{ border: '1px dashed #ccc', padding: '16px', borderRadius: '4px', minHeight: '60px', marginBottom: '16px' }}>
          {Content && <Content />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #dee2e6', paddingTop: '12px', fontSize: '12px', color: '#666' }}>
          {showBrand && <span style={{ fontWeight: 600 }}>Zyvavu CMS</span>}
          <span>{copyright}</span>
        </div>
      </div>
    )
  },
}
