import React from 'react'
import Link from 'next/link'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type RecentPostsProps = {
  id?: string
  limit?: number
  columns?: number
  heading?: string
  dataContext?: ThemeDataContext
}

export function RecentPostsFrontend({
  limit = 6,
  columns = 3,
  heading = 'Bài Viết Mới Nhất',
  dataContext,
}: RecentPostsProps) {
  const posts: any[] = dataContext?.archive?.posts || []
  const displayPosts = posts.slice(0, limit)

  if (!displayPosts.length) {
    return (
      <div className="zyvavu-widget-recent-posts" style={{ padding: '32px 0' }}>
        {heading && <h2 style={{ marginBottom: '16px' }}>{heading}</h2>}
        <p style={{ color: '#888' }}>Chưa có bài viết nào được đăng tải.</p>
      </div>
    )
  }

  const colStyle = columns === 2 ? '1fr 1fr' : columns === 4 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'

  return (
    <div className="zyvavu-widget-recent-posts" style={{ padding: '32px 0' }}>
      {heading && (
        <h2
          className="zyvavu-widget-recent-posts__heading"
          style={{
            margin: '0 0 24px 0',
            fontSize: '1.8rem',
            color: 'var(--zyvavu-theme-text, inherit)',
          }}
        >
          {heading}
        </h2>
      )}

      <div
        className="zyvavu-widget-recent-posts__grid"
        style={{
          display: 'grid',
          gridTemplateColumns: colStyle,
          gap: '24px',
        }}
      >
        {displayPosts.map((post, idx) => {
          const dateStr = post.publishedAt || post.createdAt
            ? new Date(post.publishedAt || post.createdAt).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : null
          const postUrl = post.publicPath || `/posts/${post.slug || post.id}`

          return (
            <article
              key={post.id || idx}
              className="zyvavu-widget-recent-posts__card"
              style={{
                border: '1px solid var(--zyvavu-theme-border, #dfe5e2)',
                borderRadius: '8px',
                padding: '20px',
                background: 'var(--zyvavu-theme-surface, #ffffff)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {dateStr && (
                  <span style={{ fontSize: '12px', color: 'var(--zyvavu-theme-text-muted, #5f7370)' }}>
                    {dateStr}
                  </span>
                )}
                <h3 style={{ margin: '8px 0', fontSize: '1.2rem', lineHeight: 1.4 }}>
                  <Link
                    href={postUrl}
                    style={{
                      color: 'var(--zyvavu-theme-text, inherit)',
                      textDecoration: 'none',
                    }}
                  >
                    {post.title}
                  </Link>
                </h3>
                {post.excerpt && (
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: '14px',
                      color: 'var(--zyvavu-theme-text-muted, #5f7370)',
                      lineHeight: 1.6,
                    }}
                  >
                    {post.excerpt.slice(0, 120)}...
                  </p>
                )}
              </div>
              <div style={{ marginTop: '16px' }}>
                <Link
                  href={postUrl}
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--zyvavu-theme-primary, #0e6b66)',
                    textDecoration: 'none',
                  }}
                >
                  Đọc tiếp &rarr;
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
