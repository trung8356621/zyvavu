'use client'

import type { DefaultCellComponentProps } from 'payload'
import { Link } from '@payloadcms/ui'

import './posts-title-cell.scss'

export function PostsTitleCell({ cellData, link, linkURL, rowData }: DefaultCellComponentProps) {
  const title = typeof cellData === 'string' && cellData.trim() ? cellData : 'Untitled'
  const slug = typeof rowData.slug === 'string' && rowData.slug.trim() ? rowData.slug : null
  const content = (
    <div className="zyvavu-post-title-cell">
      <span className="zyvavu-post-title-cell__title">{title}</span>
      {slug && <span className="zyvavu-post-title-cell__slug">/{slug}</span>}
    </div>
  )

  return link && linkURL ? (
    <Link className="zyvavu-post-title-cell__link" href={linkURL} prefetch={false}>
      {content}
    </Link>
  ) : (
    content
  )
}
