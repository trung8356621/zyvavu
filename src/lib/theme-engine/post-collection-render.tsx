import React from 'react'
import Link from 'next/link'
import type { LoopItemRecord } from './types'
import { formatPostDate } from './post-records'

export type PostCardPreset = 'classic-list' | 'image-card-grid' | 'compact-list'

export type ResponsiveColumns = {
  desktop?: number
  tablet?: number
  mobile?: number
}

export function collectionGridStyle(
  layout: 'list' | 'grid',
  columns: number,
  gap: string,
  responsive?: ResponsiveColumns,
): React.CSSProperties {
  if (layout === 'list') {
    return {
      display: 'flex',
      flexDirection: 'column',
      gap: gap || '16px',
    }
  }
  const desktop = Math.min(Math.max(1, columns || 3), 4)
  const tablet = Math.min(Math.max(1, responsive?.tablet || Math.min(desktop, 2)), 4)
  const mobile = Math.min(Math.max(1, responsive?.mobile || 1), 4)
  return {
    display: 'grid',
    gap: gap || '24px',
    gridTemplateColumns: `repeat(${desktop}, minmax(0, 1fr))`,
    // CSS variables consumed by scoped media queries when present
    ['--zyvavu-cols-desktop' as string]: String(desktop),
    ['--zyvavu-cols-tablet' as string]: String(tablet),
    ['--zyvavu-cols-mobile' as string]: String(mobile),
  }
}

export function collectionResponsiveCss(widgetClass: string): string {
  return `
@media (max-width: 1024px) {
  .${widgetClass}[data-layout="grid"] {
    grid-template-columns: repeat(var(--zyvavu-cols-tablet, 2), minmax(0, 1fr)) !important;
  }
}
@media (max-width: 640px) {
  .${widgetClass}[data-layout="grid"] {
    grid-template-columns: repeat(var(--zyvavu-cols-mobile, 1), minmax(0, 1fr)) !important;
  }
}`
}

function PostImage({
  record,
  height = 160,
}: {
  record: LoopItemRecord
  height?: number
}) {
  if (!record.image?.url) {
    return (
      <div
        aria-hidden
        style={{
          width: '100%',
          height,
          borderRadius: 6,
          background: 'var(--zyvavu-theme-surface-muted, #f1f5f9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 12,
        }}
      >
        No image
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={record.image.url}
      alt={record.image.alt || record.title}
      style={{
        width: '100%',
        height,
        objectFit: 'cover',
        borderRadius: 6,
        display: 'block',
      }}
    />
  )
}

export function PostCard({
  record,
  preset = 'image-card-grid',
}: {
  record: LoopItemRecord
  preset?: PostCardPreset
}) {
  const url = record.url || '#'
  const dateLabel = formatPostDate(record.date)

  if (preset === 'compact-list') {
    return (
      <article
        className="zyvavu-post-card zyvavu-post-card--compact"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'baseline',
          padding: '8px 0',
          borderBottom: '1px solid var(--zyvavu-theme-border, #e2e8f0)',
        }}
      >
        {dateLabel && (
          <time style={{ fontSize: 12, color: '#64748b', minWidth: 88, flexShrink: 0 }}>
            {dateLabel}
          </time>
        )}
        <Link
          href={url}
          style={{
            color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text, inherit))',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            lineHeight: 1.4,
          }}
        >
          {record.title}
        </Link>
      </article>
    )
  }

  if (preset === 'classic-list') {
    return (
      <article
        className="zyvavu-post-card zyvavu-post-card--classic"
        style={{
          display: 'grid',
          gridTemplateColumns: '140px minmax(0, 1fr)',
          gap: 16,
          padding: 12,
          border: '1px solid var(--zyvavu-theme-border, #e2e8f0)',
          borderRadius: 8,
          background: 'var(--zyvavu-theme-surface, #fff)',
        }}
      >
        <PostImage record={record} height={96} />
        <div>
          {dateLabel && (
            <time style={{ fontSize: 12, color: '#64748b' }}>{dateLabel}</time>
          )}
          <h3 style={{ margin: '6px 0', fontSize: '1.1rem', lineHeight: 1.35 }}>
            <Link
              href={url}
              style={{
                color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text, inherit))',
                textDecoration: 'none',
              }}
            >
              {record.title}
            </Link>
          </h3>
          {record.excerpt && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: '#64748b',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {record.excerpt}
            </p>
          )}
        </div>
      </article>
    )
  }

  return (
    <article
      className="zyvavu-post-card zyvavu-post-card--grid"
      style={{
        border: '1px solid var(--zyvavu-theme-border, #e2e8f0)',
        borderRadius: 8,
        padding: 16,
        background: 'var(--zyvavu-theme-surface, #fff)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <PostImage record={record} height={160} />
      {dateLabel && <time style={{ fontSize: 12, color: '#64748b' }}>{dateLabel}</time>}
      <h3 style={{ margin: 0, fontSize: '1.15rem', lineHeight: 1.35 }}>
        <Link
          href={url}
          style={{
            color: 'var(--zyvavu-inherited-foreground, var(--zyvavu-theme-text, inherit))',
            textDecoration: 'none',
          }}
        >
          {record.title}
        </Link>
      </h3>
      {record.excerpt && (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: '#64748b',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
          }}
        >
          {record.excerpt}
        </p>
      )}
      <Link
        href={url}
        style={{
          marginTop: 4,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--zyvavu-theme-primary, #0e6b66)',
          textDecoration: 'none',
        }}
      >
        Đọc tiếp →
      </Link>
    </article>
  )
}
