'use client'

import type { DefaultCellComponentProps } from 'payload'

import { Link } from '@payloadcms/ui'

export function PostsTitleCell({ cellData, link, linkURL, rowData }: DefaultCellComponentProps) {
  const title = typeof cellData === 'string' && cellData.trim() ? cellData : 'Untitled'
  const slug = typeof rowData.slug === 'string' && rowData.slug.trim() ? rowData.slug : null
  const content = (
    <span className="zyvavu-post-title-cell">
      <span className="zyvavu-post-title-cell__title">{title}</span>
      {slug && <span className="zyvavu-post-title-cell__slug">/{slug}</span>}
    </span>
  )

  return link && linkURL ? (
    <Link href={linkURL} prefetch={false}>
      {content}
    </Link>
  ) : (
    content
  )
}
