/** Client-safe category tree helpers (no Payload / Node imports). */

export type CategoryNode = {
  id: number
  title: string
  slug: string
  url: string
  parentId: number | null
  postCount?: number
  children: CategoryNode[]
}

export type CategoryListQueryOptions = {
  selectedIds?: Array<string | number>
  includeDescendants?: boolean
  hideEmpty?: boolean
  showCounts?: boolean
  /** Current category id for active highlighting */
  currentCategoryId?: number | null
}

export function relationId(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return value
  if (typeof value === 'object' && value && 'id' in value) {
    const id = Number((value as { id: unknown }).id)
    return Number.isFinite(id) ? id : null
  }
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

export function buildCategoryTree(nodes: CategoryNode[]): CategoryNode[] {
  const byId = new Map<number, CategoryNode>()
  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] })
  }
  const roots: CategoryNode[] = []
  for (const node of byId.values()) {
    if (node.parentId != null && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRec = (list: CategoryNode[]) => {
    list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    list.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

export function flattenCategoryTree(roots: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = []
  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      out.push(node)
      walk(node.children)
    }
  }
  walk(roots)
  return out
}

export function filterCategoryTree(
  roots: CategoryNode[],
  selected: Set<number>,
  includeDescendants: boolean,
): CategoryNode[] {
  if (selected.size === 0) return roots

  const filterNode = (node: CategoryNode): CategoryNode | null => {
    const children = node.children
      .map(filterNode)
      .filter((n): n is CategoryNode => Boolean(n))
    const selfSelected = selected.has(node.id)
    if (selfSelected) {
      return {
        ...node,
        children: includeDescendants ? node.children : children,
      }
    }
    if (children.length) return { ...node, children }
    return null
  }

  return roots.map(filterNode).filter((n): n is CategoryNode => Boolean(n))
}

export function collectExpandedIds(
  roots: CategoryNode[],
  currentId?: number | null,
  autoExpandActive = true,
): Set<number> {
  const expanded = new Set<number>()
  if (!autoExpandActive || currentId == null) return expanded

  const path: number[] = []
  const find = (nodes: CategoryNode[], trail: number[]): boolean => {
    for (const node of nodes) {
      const next = [...trail, node.id]
      if (node.id === currentId) {
        path.push(...trail)
        return true
      }
      if (find(node.children, next)) return true
    }
    return false
  }
  find(roots, [])
  path.forEach((id) => expanded.add(id))
  return expanded
}

/** Browser editor helper — uses public REST, no schema mutation. */
export async function fetchCategoriesForEditor(): Promise<CategoryNode[]> {
  const res = await fetch('/api/categories?limit=500&sort=title&depth=0', {
    credentials: 'include',
  })
  if (!res.ok) return []
  const data = await res.json()
  const docs = Array.isArray(data?.docs) ? data.docs : []
  const nodes: CategoryNode[] = docs.map((doc: any) => ({
    id: Number(doc.id),
    title: String(doc.title || `Category #${doc.id}`),
    slug: String(doc.slug || ''),
    url: String(doc.canonicalPath || (doc.slug ? `/category/${doc.slug}` : `#${doc.id}`)),
    parentId: 'parent' in doc ? relationId(doc.parent) : null,
    children: [],
  }))
  return buildCategoryTree(nodes)
}
