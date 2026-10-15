'use client'

import type { DefaultCellComponentProps } from 'payload'
import { CollectionTitleCell } from '@/components/admin/collections/CollectionTitleCell'

export function PostsTitleCell(props: DefaultCellComponentProps) {
  return <CollectionTitleCell {...props} />
}
