/** Client-safe post record helpers (no Payload / Node imports). */
import type { LoopItemRecord } from './types'
import { normalizePostDoc, toLoopItemRecord } from './normalized-item'

export type PostSort = 'newest' | 'oldest' | 'title-asc' | 'title-desc'

export type PostQueryOptions = {
  limit?: number
  sort?: PostSort
  /** Single category slug or numeric id (Collection Loop). */
  categoryId?: string
  /** One or more category slugs/ids (Post Collection). */
  categoryIds?: Array<string | number>
  /** When categories support parent relations, include descendant ids. */
  includeDescendants?: boolean
  /** Explicit post id for Featured Post manual mode. */
  postId?: string | number
  /** published only (default true). */
  publishedOnly?: boolean
}

const MAX_LIMIT = 24

export function boundPostLimit(limit?: number, fallback = 6): number {
  return Math.min(Math.max(1, Number(limit) || fallback), MAX_LIMIT)
}

export function mapDocToRecord(doc: any): LoopItemRecord {
  return toLoopItemRecord(normalizePostDoc(doc))
}

export function formatPostDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function sortField(sort: PostSort = 'newest'): string {
  switch (sort) {
    case 'oldest':
      return 'publishedAt'
    case 'title-asc':
      return 'title'
    case 'title-desc':
      return '-title'
    case 'newest':
    default:
      return '-publishedAt'
  }
}
