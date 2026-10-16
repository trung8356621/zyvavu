import React from 'react'
import Link from 'next/link'
import { useItemContext } from '@/lib/theme-engine/item-context'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type ItemTitleProps = {
  tag?: 'h2' | 'h3' | 'h4' | 'div'
  linkToPost?: boolean
  className?: string
  dataContext?: ThemeDataContext
}

export function ItemTitleFrontend({
  tag = 'h3',
  linkToPost = true,
  className = '',
  dataContext,
}: ItemTitleProps) {
  const item = useItemContext() || (dataContext as any)?.item
  const title = item?.title || 'Tiêu đề bài viết mẫu'
  const url = item?.url || '#'

  const Tag = tag as keyof React.JSX.IntrinsicElements

  const content = linkToPost && item?.url ? (
    <Link
      href={url}
      className="zyvavu-item-title__link"
      style={{
        color: 'var(--zyvavu-theme-text, inherit)',
        textDecoration: 'none',
        transition: 'color 0.2s ease',
      }}
    >
      {title}
    </Link>
  ) : (
    title
  )

  return (
    <Tag
      className={`zyvavu-item-title ${className}`.trim()}
      style={{
        margin: '0 0 8px 0',
        fontSize: tag === 'h2' ? '1.5rem' : tag === 'h3' ? '1.25rem' : '1.1rem',
        fontWeight: 700,
        lineHeight: 1.35,
        color: 'var(--zyvavu-theme-text, inherit)',
      }}
    >
      {content}
    </Tag>
  )
}
