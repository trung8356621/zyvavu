import React from 'react'
import { useItemContext } from '@/lib/theme-engine/item-context'
import type { ThemeDataContext } from '@/lib/theme-engine/types'

export type ItemExcerptProps = {
  maxLines?: number
  className?: string
  dataContext?: ThemeDataContext
}

export function ItemExcerptFrontend({
  maxLines = 3,
  className = '',
  dataContext,
}: ItemExcerptProps) {
  const item = useItemContext() || (dataContext as any)?.item
  const excerpt = item?.excerpt || 'Tóm tắt nội dung mô tả chi tiết của bài viết này để hiển thị trên thẻ card xem trước.'

  return (
    <p
      className={`zyvavu-item-excerpt ${className}`.trim()}
      style={{
        margin: '0 0 12px 0',
        fontSize: '0.95rem',
        lineHeight: 1.6,
        color: 'var(--zyvavu-theme-text-muted, #64748b)',
        display: '-webkit-box',
        WebkitLineClamp: maxLines || 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {excerpt}
    </p>
  )
}
