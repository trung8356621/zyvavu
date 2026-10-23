import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import React from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { RenderBlocks } from '@/components/frontend/RenderBlocks'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type PostContentProps = {
  style?: UniversalStyle
  id?: string
  showExcerptFirst?: boolean
  dataContext?: ThemeDataContext
}

export function PostContentFrontend({
  id: surfaceId,
  style: semanticStyle,
  showExcerptFirst = false,
  dataContext,
}: PostContentProps) {
  const doc = dataContext?.document
  const hasContent = Boolean(doc?.content)
  const hasBlocks = Array.isArray(doc?.layout) && doc.layout.length > 0
  const excerpt = doc?.excerpt

  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-post-content"
      {...animationAttributes(semanticStyle?.animation)}
      style={{ lineHeight: 1.8, ...resolveWidgetStyles(semanticStyle) }}
    >
      {showExcerptFirst && excerpt ? (
        <p
          className="zyvavu-widget-post-content__lead"
          style={{
            fontSize: '1.2em',
            fontWeight: 500,
            color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text-muted, #5f7370))',
            marginBottom: '24px',
          }}
        >
          {excerpt}
        </p>
      ) : null}

      {hasContent && doc?.content ? (
        <div className="zyvavu-widget-post-content__richtext">
          <RichText data={doc.content} />
        </div>
      ) : null}

      {hasBlocks && doc?.layout ? (
        <div className="zyvavu-widget-post-content__blocks">
          <RenderBlocks blocks={doc.layout as Array<Record<string, unknown>>} />
        </div>
      ) : null}

      {!hasContent && !hasBlocks && excerpt && !showExcerptFirst ? (
        <p className="zyvavu-widget-post-content__excerpt">{excerpt}</p>
      ) : null}

      {!hasContent && !hasBlocks && !excerpt ? (
        <p style={{ color: '#888', fontStyle: 'italic' }}>Nội dung đang được cập nhật...</p>
      ) : null}
    </div>,
    semanticStyle,
    surfaceId,
  )
}
