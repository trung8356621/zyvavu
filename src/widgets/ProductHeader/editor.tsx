'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { ProductHeaderProps } from './frontend'

export const productHeaderEditor: ComponentConfig<ProductHeaderProps> = {
  label: 'Product Details Header (Contract)',
  fields: {
    showPrice: {
      type: 'radio',
      label: 'Show Price Slot',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showAddToCart: {
      type: 'radio',
      label: 'Show Purchase CTA Button',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    showPrice: true,
    showAddToCart: true,
  },
  render: ({ showPrice = true, showAddToCart = true }) => {
    return (
      <div
        style={{
          padding: '24px',
          border: '1px dashed #ffa94d',
          borderRadius: '8px',
          background: '#fff9db',
          margin: '16px 0',
        }}
      >
        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#d9480f', fontWeight: 600 }}>
          Product Template Contract (Awaiting Real Products Collection)
        </span>
        <h2 style={{ margin: '8px 0', fontSize: '1.8rem' }}>[Tên Sản Phẩm Đăng Ký]</h2>
        {showPrice && <div style={{ fontSize: '1.2rem', color: '#0e6b66', fontWeight: 600 }}>[Giá sản phẩm]</div>}
        {showAddToCart && (
          <div style={{ marginTop: '12px' }}>
            <span style={{ padding: '6px 16px', background: '#ccc', borderRadius: '4px', fontSize: '13px' }}>
              Nút Mua Hàng (Vô hiệu hoá cho đến khi module sản phẩm sẵn sàng)
            </span>
          </div>
        )}
      </div>
    )
  },
}
