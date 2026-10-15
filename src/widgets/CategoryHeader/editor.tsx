'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { CategoryHeaderProps } from './frontend'

export const categoryHeaderEditor: ComponentConfig<CategoryHeaderProps> = {
  label: 'Category Archive Header',
  fields: {
    align: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
  },
  defaultProps: {
    align: 'left',
  },
  render: ({ align = 'left' }) => {
    return (
      <div
        className="zyvavu-widget-category-header"
        style={{
          textAlign: align,
          padding: '24px 0',
          borderBottom: '1px dashed #ced4da',
          marginBottom: '20px',
        }}
      >
        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#0e6b66', fontWeight: 600 }}>
          Category Archive
        </span>
        <h2 style={{ margin: '8px 0', fontSize: '2rem' }}>[Tên Chuyên Mục Lưu Trữ]</h2>
        <p style={{ margin: 0, color: '#666' }}>Mô tả chi tiết chuyên mục sẽ hiển thị tự động tại đây khi người dùng truy cập trang lưu trữ.</p>
      </div>
    )
  },
}
