import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type PostMetaProps = {
  style?: UniversalStyle
  id?: string
  showDate?: boolean
  showAuthor?: boolean
  showCategories?: boolean
  dataContext?: ThemeDataContext
}

export function PostMetaFrontend({
  id: surfaceId,
  style: semanticStyle,
  showDate = true,
  showAuthor = true,
  showCategories = true,
  dataContext,
}: PostMetaProps) {
  const doc = dataContext?.document
  const rawDate = doc?.updatedAt || doc?.createdAt
  const dateStr = rawDate
    ? new Date(rawDate).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null
  const categories: any[] = Array.isArray(doc?.categories) ? doc.categories : []

  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-post-meta"
      {...animationAttributes(semanticStyle?.animation)}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        color: 'var(--zyvavu-theme-text-muted, #5f7370)',
        marginBottom: '24px',
        ...resolveWidgetStyles(semanticStyle),
      }}
    >
      {showDate && dateStr ? (
        <span className="zyvavu-widget-post-meta__date">
          <time dateTime={rawDate}>{dateStr}</time>
        </span>
      ) : null}

      {showCategories && categories.length > 0 ? (
        <div
          className="zyvavu-widget-post-meta__categories"
          style={{ display: 'flex', gap: '6px' }}
        >
          {categories.map((cat, idx) => {
            const title = typeof cat === 'object' ? cat.title : `Category #${cat}`
            return (
              <span
                key={idx}
                className="zyvavu-widget-post-meta__badge"
                style={{
                  background: 'var(--zyvavu-theme-surface, #f8faf9)',
                  border: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {title}
              </span>
            )
          })}
        </div>
      ) : null}
    </div>,
    semanticStyle,
    surfaceId,
  )
}
