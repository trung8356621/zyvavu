import type { Payload, PayloadRequest } from 'payload'

import { pathForPageSlug, pathForPostSlug } from '@/lib/slug'

type Relation = string | number | { id?: string | number; slug?: string } | null | undefined

type MenuItem = {
  id?: string
  label?: string
  link?: {
    type?: 'page' | 'post' | 'custom'
    page?: Relation
    post?: Relation
    url?: string
  }
}

type MenuDoc = {
  id: string | number
  items?: MenuItem[]
}

function relationId(value: Relation): string | number | undefined {
  if (value == null) return undefined
  if (typeof value === 'string' || typeof value === 'number') return value
  return value.id
}

export async function syncMenuRegistry(payload: Payload, menu: MenuDoc, req: PayloadRequest): Promise<void> {
  await payload.delete({
    collection: 'url-registry',
    where: { menu: { equals: menu.id } },
    overrideAccess: true,
    depth: 0,
    req,
  })

  for (const item of menu.items || []) {
    const link = item.link
    if (!link?.type) continue

    let path: string | undefined
    let page: string | number | undefined
    let post: string | number | undefined

    if (link.type === 'page') {
      page = relationId(link.page)
      if (page == null) continue
      const doc = await payload.findByID({
        collection: 'pages',
        id: page,
        depth: 0,
        overrideAccess: true,
        draft: true,
        req,
      })
      if (!doc?.slug) continue
      path = pathForPageSlug(doc.slug)
    } else if (link.type === 'post') {
      post = relationId(link.post)
      if (post == null) continue
      const doc = await payload.findByID({
        collection: 'posts',
        id: post,
        depth: 0,
        overrideAccess: true,
        draft: true,
        req,
      })
      if (!doc?.slug) continue
      path = pathForPostSlug(doc.slug)
    } else if (link.type === 'custom' && link.url?.startsWith('/')) {
      path = link.url
    }

    if (!path || typeof menu.id !== 'number') continue

    await payload.create({
      collection: 'url-registry',
      overrideAccess: true,
      draft: false,
      req,
      data: {
        path,
        kind: link.type,
        page: typeof page === 'number' ? page : null,
        post: typeof post === 'number' ? post : null,
        menu: menu.id,
        menuItemId: item.id,
        label: item.label,
      },
    })
  }
}
