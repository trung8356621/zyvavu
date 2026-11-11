import type { ThemeDataContext } from './types'
import { boundPostLimit } from './post-records'
import { normalizeCategoryDoc, toLoopItemRecord } from './normalized-item'

export type CategoryQueryOptions = {
  limit?: number
  sort?: 'title-asc' | 'title-desc' | 'newest' | 'oldest'
}

/**
 * Query categories as Collection Loop items (normalized).
 * Reuses Payload categories collection — not a second query engine.
 */
export async function queryCategories(
  options: CategoryQueryOptions = {},
): Promise<import('./types').LoopItemRecord[]> {
  const limit = boundPostLimit(options.limit, 6)
  try {
    const { getPayload } = await import('payload')
    const config = (await import('@/payload.config')).default
    const payload = await getPayload({ config })
    const sort =
      options.sort === 'title-desc'
        ? '-title'
        : options.sort === 'oldest'
          ? 'createdAt'
          : options.sort === 'newest'
            ? '-createdAt'
            : 'title'

    const result = await payload.find({
      collection: 'categories',
      limit,
      depth: 1,
      sort,
      overrideAccess: true,
    })

    return result.docs.map((doc) => toLoopItemRecord(normalizeCategoryDoc(doc)))
  } catch (err) {
    console.error('[category-query] Failed to fetch categories:', err)
    return []
  }
}

export async function resolveCategories(
  options: CategoryQueryOptions,
  _dataContext?: ThemeDataContext,
): Promise<import('./types').LoopItemRecord[]> {
  return queryCategories(options)
}
