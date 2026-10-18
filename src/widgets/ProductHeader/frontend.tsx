import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type ProductHeaderProps = {
  style?: UniversalStyle

  id?: string
  showPrice?: boolean
  showAddToCart?: boolean
  dataContext?: ThemeDataContext
}

export function ProductHeaderFrontend({
  style: surfaceStyle,
  id: surfaceId,
  showPrice = true,
  showAddToCart = true,
  dataContext,
}: ProductHeaderProps) {
  const doc = dataContext?.document
  const title = doc?.title || 'Sản phẩm mẫu (Contract Boundary)'
  const price = doc?.price

  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-product-header"
      style={{
        padding: '32px',
        border: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
        borderRadius: '8px',
        background: 'var(--zyvavu-theme-surface, #ffffff)',
        marginBottom: '24px',
      }}
    >
      <div
        style={{ fontSize: '12px', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}
      >
        Product Template Contract Boundary
      </div>
      <h1 style={{ margin: '0 0 12px', fontSize: '2rem' }}>{title}</h1>
      {showPrice && (
        <div
          style={{
            fontSize: '1.4rem',
            fontWeight: 600,
            color: 'var(--zyvavu-theme-primary, #0e6b66)',
            marginBottom: '16px',
          }}
        >
          {price ? `${price} đ` : 'Liên hệ báo giá'}
        </div>
      )}
      {showAddToCart && (
        <button
          type="button"
          disabled
          style={{
            padding: '10px 24px',
            background: 'var(--zyvavu-theme-primary, #0e6b66)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'not-allowed',
            opacity: 0.6,
          }}
        >
          Đặt hàng (Chờ nhà cung cấp sản phẩm)
        </button>
      )}
    </div>,
    surfaceStyle,
    surfaceId,
  )
}
