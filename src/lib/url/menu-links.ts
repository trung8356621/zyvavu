import type { Payload } from 'payload'

import { getCanonicalPath } from './registry'

type Relation = string | number | { id?: string | number | null } | null | undefined

type MenuItem = {
  id?: string | null
  label?: string | null
  link?: {
    type?: string | null
    url?: string | null
    newTab?: boolean | null
    page?: Relation
    post?: Relation
  } | null
}

export type NavLink = {
  id?: string | null
  label: string
  href: string
  newTab: boolean
}

function relationId(value: Relation): number | undefined {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof value.id === 'number') return value.id
  return undefined
}

export async function linksForMenu(payload: Payload, items: MenuItem[]): Promise<NavLink[]> {
  const links: NavLink[] = []
  for (const item of items) {
    if (!item.label || !item.link?.type) continue
    let href: string | null = null
    if (item.link.type === 'custom') {
      href = item.link.url || null
    } else if (item.link.type === 'page') {
      const id = relationId(item.link.page)
      href = id == null ? null : await getCanonicalPath(payload, 'page', id)
    } else if (item.link.type === 'post') {
      const id = relationId(item.link.post)
      href = id == null ? null : await getCanonicalPath(payload, 'post', id)
    }
    if (!href) continue
    links.push({
      id: item.id,
      label: item.label,
      href,
      newTab: Boolean(item.link.newTab),
    })
  }
  return links
}
