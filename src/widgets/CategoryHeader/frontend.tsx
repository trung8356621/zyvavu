import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type CategoryHeaderProps = {
  id?: string
  align?: 'left' | 'center'
  title?: string
  description?: string
  dataContext?: ThemeDataContext
}

export function CategoryHeaderFrontend({
  align = 'left',
  title: customTitle,
  description: customDescription,
  dataContext,
}: CategoryHeaderProps) {
  const title = customTitle || dataContext?.archive?.title || 'Chuyên Mục'
  const description = customDescription || dataContext?.archive?.description

  return (
    <div
      className="zyvavu-widget-category-header"
      style={{
        textAlign: align,
        padding: '32px 0 24px',
        borderBottom: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
        marginBottom: '32px',
      }}
    >
      <div style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--zyvavu-theme-primary, #0e6b66)', fontWeight: 600, marginBottom: '6px' }}>
        Chuyên mục
      </div>
      <h1
        className="zyvavu-widget-category-header__title"
        style={{
          margin: '0 0 12px 0',
          fontSize: '2.4rem',
          color: 'var(--zyvavu-theme-text, inherit)',
        }}
      >
        {title}
      </h1>
      {description ? (
        <p
          className="zyvavu-widget-category-header__description"
          style={{
            margin: 0,
            fontSize: '1.1rem',
            color: 'var(--zyvavu-theme-text-muted, #5f7370)',
            maxWidth: '700px',
            marginLeft: align === 'center' ? 'auto' : 0,
            marginRight: align === 'center' ? 'auto' : 0,
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}
