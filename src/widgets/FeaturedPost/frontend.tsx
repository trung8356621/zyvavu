import type { UniversalStyle } from '@/lib/style-engine/types'
import { resolveWidgetStyles } from '@/lib/style-engine/serializer'
import { animationAttributes } from '@/lib/style-engine/animation-presets'
import { withWidgetStyleSurface } from '@/lib/style-engine/WidgetStyleSurface'
import React from 'react'
import Link from 'next/link'
import type { LoopItemRecord, ThemeDataContext } from '@/lib/theme-engine/types'
import { formatPostDate, mapDocToRecord, resolvePosts } from '@/lib/theme-engine/post-query'

export type FeaturedPostPreset = 'spotlight' | 'horizontal' | 'minimal'

export type FeaturedPostProps = {
  style?: UniversalStyle
  id?: string
  mode?: 'latest' | 'manual'
  postId?: string
  preset?: FeaturedPostPreset
  showImage?: boolean
  showExcerpt?: boolean
  showDate?: boolean
  emptyText?: string
  dataContext?: ThemeDataContext
}

function FeaturedPostView({
  record,
  props,
}: {
  record: LoopItemRecord | null
  props: FeaturedPostProps
}) {
  const {
    id: surfaceId,
    style: semanticStyle,
    preset = 'spotlight',
    showImage = true,
    showExcerpt = true,
    showDate = true,
    emptyText = 'Chưa có bài viết nổi bật.',
  } = props

  if (!record || !record.title) {
    return withWidgetStyleSurface(
      <div
        className="zyvavu-widget-featured-post zyvavu-widget-featured-post--empty"
        {...animationAttributes(semanticStyle?.animation)}
        style={{ padding: '24px 0', ...resolveWidgetStyles(semanticStyle) }}
      >
        <p style={{ color: '#888', fontStyle: 'italic', margin: 0 }}>{emptyText}</p>
      </div>,
      semanticStyle,
      surfaceId,
    )
  }

  const url = record.url || '#'
  const dateLabel = showDate ? formatPostDate(record.date) : null
  const image = showImage ? record.image : undefined

  const title = (
    <h2
      style={{
        margin: '0 0 8px',
        fontSize: preset === 'minimal' ? '1.25rem' : '1.75rem',
        lineHeight: 1.3,
        fontWeight: 700,
      }}
    >
      <Link
        href={url}
        style={{
          color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text, inherit))',
          textDecoration: 'none',
        }}
      >
        {record.title}
      </Link>
    </h2>
  )

  const meta = dateLabel ? (
    <time style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 8 }}>
      {dateLabel}
    </time>
  ) : null

  const excerpt =
    showExcerpt && record.excerpt ? (
      <p
        style={{
          margin: '0 0 12px',
          fontSize: '1rem',
          lineHeight: 1.6,
          color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text-muted, #64748b))',
        }}
      >
        {record.excerpt}
      </p>
    ) : null

  const cta = (
    <Link
      href={url}
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--zyvavu-theme-primary, #0e6b66)',
        textDecoration: 'none',
      }}
    >
      Đọc bài viết →
    </Link>
  )

  const media = image?.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={image.alt || record.title}
      style={{
        width: '100%',
        height: preset === 'horizontal' ? 220 : 280,
        objectFit: 'cover',
        borderRadius: 8,
        display: 'block',
      }}
    />
  ) : showImage ? (
    <div
      aria-hidden
      style={{
        width: '100%',
        height: preset === 'horizontal' ? 220 : 180,
        borderRadius: 8,
        background: 'var(--zyvavu-theme-surface-muted, #f1f5f9)',
      }}
    />
  ) : null

  let body: React.ReactNode
  if (preset === 'horizontal') {
    body = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: media ? 'minmax(0, 1.1fr) minmax(0, 1fr)' : '1fr',
          gap: 24,
          alignItems: 'center',
        }}
      >
        {media}
        <div>
          {meta}
          {title}
          {excerpt}
          {cta}
        </div>
      </div>
    )
  } else if (preset === 'minimal') {
    body = (
      <div>
        {meta}
        {title}
        {excerpt}
        {cta}
      </div>
    )
  } else {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {media}
        <div>
          {meta}
          {title}
          {excerpt}
          {cta}
        </div>
      </div>
    )
  }

  return withWidgetStyleSurface(
    <div
      className={`zyvavu-widget-featured-post zyvavu-widget-featured-post--${preset}`}
      {...animationAttributes(semanticStyle?.animation)}
      style={{ padding: '24px 0', ...resolveWidgetStyles(semanticStyle) }}
    >
      {body}
    </div>,
    semanticStyle,
    surfaceId,
  )
}

export function FeaturedPostFrontend(
  props: FeaturedPostProps,
): React.ReactNode | Promise<React.ReactNode> {
  const { mode = 'latest', postId, dataContext } = props

  if (mode === 'manual' && postId && String(postId).trim()) {
    return resolvePosts({ postId: String(postId).trim(), limit: 1 }, dataContext).then((records) => (
      <FeaturedPostView record={records[0] || null} props={props} />
    ))
  }

  if (Array.isArray(dataContext?.archive?.posts)) {
    const first = dataContext.archive.posts[0]
    return (
      <FeaturedPostView
        record={first ? mapDocToRecord(first) : null}
        props={props}
      />
    )
  }

  return resolvePosts({ limit: 1, sort: 'newest' }, dataContext).then((records) => (
    <FeaturedPostView record={records[0] || null} props={props} />
  ))
}
