import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type CategoryHeaderProps = {
  style?: UniversalStyle
  id?: string
  align?: 'left' | 'center'
  title?: string
  description?: string
  dataContext?: ThemeDataContext
}

export function CategoryHeaderFrontend({
  style: semanticStyle,
  align = 'left',
  title: customTitle,
  description: customDescription,
  dataContext,
}: CategoryHeaderProps) {
  const isTag = dataContext?.archive?.taxonomyType === 'tag'
  const title = customTitle || dataContext?.archive?.title || (isTag ? 'Thẻ' : 'Chuyên Mục')
  const description = customDescription || dataContext?.archive?.description

  return (
    <div
      className="zyvavu-widget-category-header"
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        textAlign: align,
        padding: '32px 0 24px',
        borderBottom: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
        marginBottom: '32px',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      <div
        style={{
          fontSize: '13px',
          textTransform: 'uppercase',
          color: 'var(--zyvavu-theme-primary, #0e6b66)',
          fontWeight: 600,
          marginBottom: '6px',
        }}
      >
        {isTag ? 'Thẻ' : 'Chuyên mục'}
      </div>
      <h1
        className="zyvavu-widget-category-header__title"
        style={{
          margin: '0 0 12px 0',
          fontSize: '2.4rem',
          ...resolveWidgetStyles({ typography: semanticStyle?.typography }),
          color: resolveWidgetStyles(semanticStyle).color || 'var(--zyvavu-theme-text, inherit)',
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
