'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { PostMetaProps } from './frontend'

export const postMetaEditor: ComponentConfig<PostMetaProps> = {
  label: 'Document Metadata',
  fields: {
    showDate: {
      type: 'radio',
      label: 'Display Date',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showCategories: {
      type: 'radio',
      label: 'Display Category Badges',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    showDate: true,
    showCategories: true,
  },
  render: ({ showDate = true, showCategories = true }) => {
    return (
      <div
        className="zyvavu-widget-post-meta"
        style={{
          display: 'flex',
          gap: '12px',
          padding: '8px 0',
          fontSize: '13px',
          color: '#666',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '16px',
        }}
      >
        {showDate && <span>📅 15 Tháng Mười, 2026</span>}
        {showCategories && (
          <span style={{ background: '#eef2f1', padding: '2px 8px', borderRadius: '4px', color: '#0e6b66' }}>
            🏷️ Tin Tức Doanh Nghiệp
          </span>
        )}
      </div>
    )
  },
}
