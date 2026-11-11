import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import React from 'react'
import type { LoopItemRecord, ThemeDataContext } from '@/lib/theme-engine/types'
import {
  boundPostLimit,
  mapDocToRecord,
  resolvePosts,
  type PostSort,
} from '@/lib/theme-engine/post-query'
import {
  collectionGridStyle,
  collectionResponsiveCss,
  PostCard,
  type PostCardPreset,
} from '@/lib/theme-engine/post-collection-render'

export type PostCollectionProps = {
  style?: UniversalStyle
  id?: string
  heading?: string
  /** Comma or newline separated category slugs/ids. */
  categoryIds?: string
  includeDescendants?: boolean
  sort?: PostSort
  limit?: number
  layout?: 'list' | 'grid'
  columns?: number
  columnsTablet?: number
  columnsMobile?: number
  gap?: string
  preset?: PostCardPreset
  emptyText?: string
  dataContext?: ThemeDataContext
}

function parseCategoryIds(raw?: string): Array<string | number> {
  if (!raw || !String(raw).trim()) return []
  return String(raw)
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function renderCollection(props: PostCollectionProps, records: LoopItemRecord[]) {
  const {
    id: surfaceId,
    style: semanticStyle,
    heading = 'Bài viết',
    layout = 'grid',
    columns = 3,
    columnsTablet = 2,
    columnsMobile = 1,
    gap = '24px',
    preset = 'image-card-grid',
    emptyText = 'Chưa có bài viết nào.',
  } = props

  const effectivePreset: PostCardPreset =
    preset ||
    (layout === 'list' ? 'classic-list' : 'image-card-grid')

  const effectiveLayout =
    effectivePreset === 'classic-list' || effectivePreset === 'compact-list' ? 'list' : layout

  const gridClass = 'zyvavu-widget-post-collection__grid'

  return withWidgetStyleSurface(
    <div
      className="zyvavu-widget-post-collection"
      {...animationAttributes(semanticStyle?.animation)}
      style={{ padding: '24px 0', ...resolveWidgetStyles(semanticStyle) }}
    >
      <style dangerouslySetInnerHTML={{ __html: collectionResponsiveCss(gridClass) }} />
      {heading && (
        <h2
          className="zyvavu-widget-post-collection__heading"
          style={{
            margin: '0 0 24px',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text, inherit))',
          }}
        >
          {heading}
        </h2>
      )}
      {records.length === 0 ? (
        <p style={{ color: '#888', fontStyle: 'italic', margin: 0 }}>{emptyText}</p>
      ) : (
        <div
          className={gridClass}
          data-layout={effectiveLayout === 'list' ? 'list' : 'grid'}
          style={collectionGridStyle(effectiveLayout, columns, gap, {
            tablet: columnsTablet,
            mobile: columnsMobile,
          })}
        >
          {records.map((record, idx) => (
            <PostCard key={record.id || idx} record={record} preset={effectivePreset} />
          ))}
        </div>
      )}
    </div>,
    semanticStyle,
    surfaceId,
  )
}

export function PostCollectionFrontend(
  props: PostCollectionProps,
): React.ReactNode | Promise<React.ReactNode> {
  const {
    categoryIds,
    includeDescendants = false,
    sort = 'newest',
    limit = 6,
    dataContext,
  } = props

  const tokens = parseCategoryIds(categoryIds)
  const bounded = boundPostLimit(limit, 6)

  if (!tokens.length && Array.isArray(dataContext?.archive?.posts)) {
    return renderCollection(
      props,
      dataContext.archive.posts.slice(0, bounded).map(mapDocToRecord),
    )
  }

  return resolvePosts(
    {
      limit: bounded,
      sort,
      categoryIds: tokens,
      includeDescendants,
    },
    dataContext,
  ).then((records) => renderCollection(props, records))
}
