import type { ThemeDataContext } from './types'
import {
  boundPostLimit,
  mapDocToRecord,
  sortField,
  type PostQueryOptions,
  type PostSort,
} from './post-records'

export type { PostQueryOptions, PostSort } from './post-records'
export { boundPostLimit, formatPostDate, mapDocToRecord } from './post-records'

function parseCategoryToken(token: string | number): { kind: 'id' | 'slug'; value: string | number } {
  if (typeof token === 'number' || /^\d+$/.test(String(token).trim())) {
    return { kind: 'id', value: Number(token) }
  }
  return { kind: 'slug', value: String(token).trim() }
}

async function resolveCategoryIds(
  payload: any,
  tokens: Array<string | number>,
  includeDescendants: boolean,
): Promise<number[]> {
  const ids = new Set<number>()

  for (const token of tokens) {
    if (token === '' || token == null) continue
    const parsed = parseCategoryToken(token)
    if (parsed.kind === 'id') {
      ids.add(Number(parsed.value))
      continue
    }
    const catRes = await payload.find({
      collection: 'categories',
      where: { slug: { equals: parsed.value } },
      limit: 1,
      overrideAccess: true,
    })
    if (catRes.docs[0]?.id != null) ids.add(Number(catRes.docs[0].id))
  }

  if (!includeDescendants || ids.size === 0) return [...ids]

  // Optional hierarchy: only when categories expose a `parent` field.
  try {
    const sample = await payload.find({
      collection: 'categories',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const hasParent = sample.docs[0] && 'parent' in (sample.docs[0] as object)
    if (!hasParent) return [...ids]

    const all = await payload.find({
      collection: 'categories',
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    const byParent = new Map<number, number[]>()
    for (const doc of all.docs) {
      const parent =
        typeof doc.parent === 'object' && doc.parent ? Number(doc.parent.id) : Number(doc.parent)
      if (!Number.isFinite(parent)) continue
      const list = byParent.get(parent) || []
      list.push(Number(doc.id))
      byParent.set(parent, list)
    }
    const queue = [...ids]
    while (queue.length) {
      const current = queue.pop()!
      for (const child of byParent.get(current) || []) {
        if (!ids.has(child)) {
          ids.add(child)
          queue.push(child)
        }
      }
    }
  } catch {
    // Hierarchy unavailable — keep resolved ids only.
  }

  return [...ids]
}

/**
 * Shared published-post query for Collection Loop, Featured Post, Post Collection.
 * No arbitrary filters / JS — validated options only.
 */
export async function queryPosts(options: PostQueryOptions = {}): Promise<
  import('./types').LoopItemRecord[]
> {
  const limit = boundPostLimit(options.limit, options.postId != null ? 1 : 6)
  const publishedOnly = options.publishedOnly !== false

  try {
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    const payload = await getPayload({ config })

    if (options.postId != null && String(options.postId).trim() !== '') {
      try {
        const doc = await payload.findByID({
          collection: 'posts',
          id: options.postId,
          depth: 2,
          overrideAccess: true,
        })
        if (!doc) return []
        if (publishedOnly && doc._status && doc._status !== 'published') return []
        return [mapDocToRecord(doc)]
      } catch {
        return []
      }
    }

    const where: Record<string, any> = {}
    if (publishedOnly) where._status = { equals: 'published' }

    const rawTokens: Array<string | number> = [
      ...(options.categoryIds || []),
      ...(options.categoryId && options.categoryId.trim() ? [options.categoryId.trim()] : []),
    ]
    if (rawTokens.length) {
      const categoryIds = await resolveCategoryIds(
        payload,
        rawTokens,
        Boolean(options.includeDescendants),
      )
      if (categoryIds.length === 1) {
        where['categories.id'] = { equals: categoryIds[0] }
      } else if (categoryIds.length > 1) {
        where['categories.id'] = { in: categoryIds }
      } else {
        return []
      }
    }

    const result = await payload.find({
      collection: 'posts',
      where,
      sort: sortField(options.sort || 'newest'),
      limit,
      depth: 2,
      overrideAccess: true,
    })

    return result.docs.map(mapDocToRecord)
  } catch (err) {
    console.error('[post-query] Failed to fetch posts:', err)
    return []
  }
}

/** Prefer explicit query; fall back to archive posts in dataContext when unfiltered. */
export async function resolvePosts(
  options: PostQueryOptions,
  dataContext?: ThemeDataContext,
): Promise<import('./types').LoopItemRecord[]> {
  const limit = boundPostLimit(options.limit, options.postId != null ? 1 : 6)
  const hasFilter =
    options.postId != null ||
    (options.categoryId && options.categoryId.trim()) ||
    (options.categoryIds && options.categoryIds.length > 0)

  if (!hasFilter && Array.isArray(dataContext?.archive?.posts)) {
    return dataContext.archive.posts.slice(0, limit).map(mapDocToRecord)
  }

  const records = await queryPosts(options)
  if (records.length || hasFilter) return records

  if (Array.isArray(dataContext?.archive?.posts)) {
    return dataContext.archive.posts.slice(0, limit).map(mapDocToRecord)
  }
  return []
}
