import type { Payload } from 'payload'
import { attachCanonicalUrls } from '@/lib/url/registry'
import {
  buildCategoryTree,
  filterCategoryTree,
  relationId,
  type CategoryListQueryOptions,
  type CategoryNode,
} from './category-tree'

export type {
  CategoryListQueryOptions,
  CategoryNode,
} from './category-tree'
export {
  buildCategoryTree,
  collectExpandedIds,
  fetchCategoriesForEditor,
  filterCategoryTree,
  flattenCategoryTree,
  relationId,
} from './category-tree'

export async function loadCategoryNodes(
  payload: Payload,
  options: CategoryListQueryOptions = {},
): Promise<CategoryNode[]> {
  const result = await payload.find({
    collection: 'categories',
    limit: 500,
    depth: 0,
    sort: 'title',
    overrideAccess: true,
  })

  const withPaths = await attachCanonicalUrls(payload, 'category', result.docs)

  let counts = new Map<number, number>()
  if (options.showCounts || options.hideEmpty) {
    counts = await loadCategoryPostCounts(
      payload,
      withPaths.map((d) => Number(d.id)),
    )
  }

  const nodes: CategoryNode[] = withPaths.map((doc: any) => {
    const parentId = 'parent' in doc ? relationId(doc.parent) : null
    return {
      id: Number(doc.id),
      title: String(doc.title || `Category #${doc.id}`),
      slug: String(doc.slug || ''),
      url: String(doc.canonicalPath || (doc.slug ? `/category/${doc.slug}` : '#')),
      parentId,
      postCount: counts.get(Number(doc.id)),
      children: [],
    }
  })

  let roots = buildCategoryTree(nodes)

  if (options.selectedIds?.length) {
    const selected = new Set(
      options.selectedIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    )
    roots = filterCategoryTree(roots, selected, Boolean(options.includeDescendants))
  }

  if (options.hideEmpty) {
    const prune = (list: CategoryNode[]): CategoryNode[] =>
      list
        .map((node) => ({ ...node, children: prune(node.children) }))
        .filter((node) => (node.postCount || 0) > 0 || node.children.length > 0)
    roots = prune(roots)
  }

  return roots
}

async function loadCategoryPostCounts(
  payload: Payload,
  categoryIds: number[],
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  await Promise.all(
    categoryIds.map(async (id) => {
      try {
        const res = await payload.find({
          collection: 'posts',
          where: {
            and: [{ _status: { equals: 'published' } }, { categories: { contains: id } }],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        map.set(id, res.totalDocs || 0)
      } catch {
        map.set(id, 0)
      }
    }),
  )
  return map
}
