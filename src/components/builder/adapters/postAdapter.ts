import type { CategoryQueryOptions, PostDataSourceAdapter } from './types'
import type { PostItemData } from '../templates/registry'

export class PayloadPostDataSourceAdapter implements PostDataSourceAdapter {
  async fetchPostsByCategory(options: CategoryQueryOptions): Promise<PostItemData[]> {
    const { categoryId, limit = 4, sortBy = 'publishedAt:desc' } = options

    if (!categoryId) {
      return []
    }

    // Enforce safe bounds: 1 to 12 posts maximum per mega block
    const safeLimit = Math.min(Math.max(Number(limit) || 4, 1), 12)

    // Map sortBy to Payload API sort string
    let sortParam = '-publishedAt'
    if (sortBy === 'publishedAt:asc') sortParam = 'publishedAt'
    else if (sortBy === 'title:asc') sortParam = 'title'
    else if (sortBy === 'title:desc') sortParam = '-title'
    else if (sortBy === 'updatedAt:desc') sortParam = '-updatedAt'

    const queryParams = new URLSearchParams()
    queryParams.set('where[categories][contains]', String(categoryId))
    queryParams.set('where[_status][equals]', 'published')
    queryParams.set('limit', String(safeLimit))
    queryParams.set('sort', sortParam)
    queryParams.set('depth', '0')

    const res = await fetch(`/api/posts?${queryParams.toString()}`, {
      credentials: 'include',
    })

    if (!res.ok) {
      throw new Error(`Failed to load posts for category (${res.status} ${res.statusText})`)
    }

    const data = await res.json()
    const docs = Array.isArray(data?.docs) ? data.docs : []

    return docs.map((doc: any): PostItemData => {
      // Authoritative CMS URL resolution:
      // 1. Canonical path from URL Registry (attached via afterRead)
      // 2. Explicit publicPath if configured
      // 3. Fallback /posts/[slug]
      let url = `/posts/${doc.slug || doc.id}`
      if (typeof doc.canonicalPath === 'string' && doc.canonicalPath.trim()) {
        url = doc.canonicalPath.startsWith('/') ? doc.canonicalPath : `/${doc.canonicalPath}`
      } else if (typeof doc.publicPath === 'string' && doc.publicPath.trim()) {
        url = doc.publicPath.startsWith('/') ? doc.publicPath : `/${doc.publicPath}`
      }

      return {
        id: doc.id,
        title: doc.title || 'Untitled Post',
        slug: doc.slug || String(doc.id),
        url,
        excerpt: doc.excerpt || null,
        publishedAt: doc.publishedAt || doc.createdAt || null,
        updatedAt: doc.updatedAt || null,
      }
    })
  }
}

export const payloadPostAdapter = new PayloadPostDataSourceAdapter()
