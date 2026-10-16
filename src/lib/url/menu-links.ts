import type { Payload } from 'payload'

import { getCanonicalPath } from './registry'

type Relation = string | number | { id?: string | number | null } | null | undefined

export type MenuItem = {
  id?: string | null
  label?: string | null
  parentId?: string | null
  hasSubmenu?: boolean | null
  submenuType?: 'classic' | 'mega' | null
  dropdownEffect?: string | null
  triggerOnly?: boolean | null
  link?: {
    type?: string | null
    url?: string | null
    newTab?: boolean | null
    page?: Relation
    post?: Relation
    category?: Relation
    tag?: Relation
  } | null
}

export type NavLink = {
  id?: string | null
  label: string
  href: string
  newTab: boolean
}

export type ResolvedMenuItem = {
  id: string
  label: string
  href: string
  newTab: boolean
  parentId?: string | null
  hasSubmenu: boolean
  submenuType: 'classic' | 'mega'
  dropdownEffect: string
  triggerOnly: boolean
  children: ResolvedMenuItem[]
  megaLayout?: any
}

function relationId(value: Relation): number | undefined {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof value.id === 'number') return value.id
  return undefined
}

export async function resolveItemHref(payload: Payload, link?: MenuItem['link']): Promise<string> {
  if (!link?.type) return '/'
  if (link.type === 'custom') {
    return link.url || '/'
  }
  if (link.type === 'page') {
    const id = relationId(link.page)
    const canonical = id == null ? null : await getCanonicalPath(payload, 'page', id)
    return canonical || '/'
  }
  if (link.type === 'post') {
    const id = relationId(link.post)
    const canonical = id == null ? null : await getCanonicalPath(payload, 'post', id)
    return canonical || '/'
  }
  if (link.type === 'category') {
    const id = relationId(link.category)
    const canonical = id == null ? null : await getCanonicalPath(payload, 'category', id)
    return canonical || '/'
  }
  if (link.type === 'tag') {
    const id = relationId(link.tag)
    const canonical = id == null ? null : await getCanonicalPath(payload, 'tag', id)
    return canonical || '/'
  }
  return '/'
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
    } else if (item.link.type === 'category') {
      const id = relationId(item.link.category)
      href = id == null ? null : await getCanonicalPath(payload, 'category', id)
    } else if (item.link.type === 'tag') {
      const id = relationId(item.link.tag)
      href = id == null ? null : await getCanonicalPath(payload, 'tag', id)
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

/**
 * Resolves full hierarchical navigation tree with canonical URLs,
 * preserving dropdown effects, classic submenus, and per-item mega layouts.
 */
export async function resolveMenuHierarchy(
  payload: Payload,
  menuDoc: any,
): Promise<ResolvedMenuItem[]> {
  const rawItems: MenuItem[] = Array.isArray(menuDoc?.items) ? menuDoc.items : []
  if (rawItems.length === 0) return []

  const megaLayouts = menuDoc?.megaLayouts || {}
  const menuDefaultEffect = menuDoc?.defaultDropdownEffect || 'fade'

  // Step 1: Resolve Href and build map
  const nodeMap = new Map<string, ResolvedMenuItem>()
  const parentMap = new Map<string, string>()
  const rootOrder: string[] = []

  for (let idx = 0; idx < rawItems.length; idx++) {
    const item = rawItems[idx]
    const rawId = item.id || `item_${idx}`
    let parentId: string | null = item.parentId || null
    let nodeId = rawId

    if (rawId.startsWith('p_') && rawId.includes('__')) {
      const match = rawId.match(/^p_(.*?)__(.*)$/)
      if (match) {
        if (!parentId) parentId = match[1]
        nodeId = match[2]
      }
    }

    const href = await resolveItemHref(payload, item.link)
    const effect =
      item.dropdownEffect && item.dropdownEffect !== 'inherit'
        ? item.dropdownEffect
        : menuDefaultEffect

    const isMega = item.hasSubmenu && item.submenuType === 'mega'
    const megaLayout = isMega
      ? megaLayouts[nodeId] || megaLayouts[rawId] || menuDoc?.megaLayout || null
      : undefined

    const node: ResolvedMenuItem = {
      id: nodeId,
      label: item.label?.trim() || 'Untitled',
      href,
      newTab: Boolean(item.link?.newTab),
      parentId: parentId || null,
      hasSubmenu: Boolean(item.hasSubmenu),
      submenuType: item.submenuType || 'classic',
      dropdownEffect: effect,
      triggerOnly: Boolean(item.triggerOnly),
      children: [],
      megaLayout,
    }

    nodeMap.set(nodeId, node)

    if (parentId) {
      parentMap.set(nodeId, parentId)
    } else {
      rootOrder.push(nodeId)
    }
  }

  // Step 2: Assemble Tree
  const roots: ResolvedMenuItem[] = []

  rootOrder.forEach((id) => {
    const node = nodeMap.get(id)
    if (node) roots.push(node)
  })

  parentMap.forEach((parentId, childId) => {
    const parentNode = nodeMap.get(parentId)
    const childNode = nodeMap.get(childId)
    if (parentNode && childNode) {
      parentNode.children.push(childNode)
    } else if (childNode) {
      roots.push(childNode)
    }
  })

  return roots
}
