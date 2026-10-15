import type { ItemDropdownEffectId } from '../shared/dropdownEffects'

export type ClassicMenuItem = {
  id?: string
  label: string
  link?: {
    type?: 'page' | 'post' | 'custom'
    page?: any
    post?: any
    url?: string | null
    newTab?: boolean
  }
  parentId?: string | null
  hasSubmenu?: boolean
  submenuType?: 'classic' | 'mega'
  dropdownEffect?: ItemDropdownEffectId
  triggerOnly?: boolean
}

export type MenuTreeNode = {
  id: string
  label: string
  link?: {
    type?: 'page' | 'post' | 'custom'
    page?: any
    post?: any
    url?: string | null
    newTab?: boolean
  }
  url?: string
  newTab?: boolean
  sourceLinkId?: string
  children?: MenuTreeNode[]
  collapsed?: boolean
  parentId?: string | null
  hasSubmenu?: boolean
  submenuType?: 'classic' | 'mega'
  dropdownEffect?: ItemDropdownEffectId
  triggerOnly?: boolean
}

// Generates a random stable client ID
export function generateNodeId(): string {
  return `node_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`
}

/**
 * Converts a flat list of ClassicMenuItems into a hierarchical MenuTreeNode[]
 * Uses either item.parentId or the p_<parentId>__<nodeId> ID convention for backwards-compatible persistence.
 */
export function flatItemsToTree(items: ClassicMenuItem[]): MenuTreeNode[] {
  if (!Array.isArray(items) || items.length === 0) return []

  const nodeMap = new Map<string, MenuTreeNode>()
  const parentMap = new Map<string, string>()
  const rootOrder: string[] = []

  // Pass 1: create node objects
  items.forEach((item, idx) => {
    const rawId = item.id || `legacy_${idx}`
    let parentId: string | null = item.parentId || null
    let nodeId = rawId

    if (rawId.startsWith('p_') && rawId.includes('__')) {
      const match = rawId.match(/^p_(.*?)__(.*)$/)
      if (match) {
        if (!parentId) parentId = match[1]
        nodeId = match[2]
      }
    }

    const node: MenuTreeNode = {
      id: nodeId,
      label: item.label || 'Untitled',
      link: item.link
        ? {
            type: item.link.type || 'custom',
            page: item.link.page,
            post: item.link.post,
            url: item.link.url,
            newTab: Boolean(item.link.newTab),
          }
        : { type: 'custom', url: '/', newTab: false },
      url: item.link?.url || undefined,
      newTab: Boolean(item.link?.newTab),
      parentId: parentId || null,
      hasSubmenu: Boolean(item.hasSubmenu),
      submenuType: item.submenuType || 'classic',
      dropdownEffect: item.dropdownEffect || 'inherit',
      triggerOnly: Boolean(item.triggerOnly),
      children: [],
    }

    nodeMap.set(nodeId, node)

    if (parentId) {
      parentMap.set(nodeId, parentId)
    } else {
      rootOrder.push(nodeId)
    }
  })

  // Pass 2: assemble tree
  const roots: MenuTreeNode[] = []

  // Add root nodes in preserved order
  rootOrder.forEach((id) => {
    const node = nodeMap.get(id)
    if (node) roots.push(node)
  })

  // Attach children to parents
  parentMap.forEach((parentId, childId) => {
    const parentNode = nodeMap.get(parentId)
    const childNode = nodeMap.get(childId)
    if (parentNode && childNode) {
      if (!parentNode.children) parentNode.children = []
      parentNode.children.push(childNode)
    } else if (childNode) {
      // If parent was missing or orphaned, recover to root
      roots.push(childNode)
    }
  })

  return roots
}

/**
 * Converts a hierarchical MenuTreeNode[] back into a flat ClassicMenuItem[]
 * Preserves parentId and per-item submenu metadata.
 */
export function treeToFlatItems(
  tree: MenuTreeNode[],
  parentId?: string,
): ClassicMenuItem[] {
  const result: ClassicMenuItem[] = []

  for (const node of tree) {
    const itemType = node.link?.type || 'custom'

    let sanitizedLink: any = {
      type: itemType,
      newTab: Boolean(node.link?.newTab ?? node.newTab),
    }

    if (itemType === 'page') {
      const pageId =
        typeof node.link?.page === 'object' && node.link?.page !== null
          ? node.link.page.id
          : node.link?.page
      sanitizedLink.page = pageId ? Number(pageId) || pageId : null
      sanitizedLink.post = null
      sanitizedLink.url = null
    } else if (itemType === 'post') {
      const postId =
        typeof node.link?.post === 'object' && node.link?.post !== null
          ? node.link.post.id
          : node.link?.post
      sanitizedLink.post = postId ? Number(postId) || postId : null
      sanitizedLink.page = null
      sanitizedLink.url = null
    } else {
      sanitizedLink.type = 'custom'
      sanitizedLink.url = node.link?.url || node.url || '/'
      sanitizedLink.page = null
      sanitizedLink.post = null
    }

    result.push({
      id: node.id,
      label: node.label.trim() || 'Untitled',
      link: sanitizedLink,
      parentId: parentId || null,
      hasSubmenu: Boolean(node.hasSubmenu),
      submenuType: node.submenuType || 'classic',
      dropdownEffect: node.dropdownEffect || 'inherit',
      triggerOnly: Boolean(node.triggerOnly),
    })

    if (Array.isArray(node.children) && node.children.length > 0) {
      const childItems = treeToFlatItems(node.children, node.id)
      result.push(...childItems)
    }
  }

  return result
}

export type DisplayRow = {
  node: MenuTreeNode
  depth: number
  parentId?: string
  parentTitle?: string
  indexInLevel: number
  totalInLevel: number
  canIndent: boolean
  canOutdent: boolean
}

/**
 * Flattens tree into sequential display rows with depth and navigation capabilities
 */
export function flattenTreeForDisplay(
  nodes: MenuTreeNode[],
  depth = 0,
  parentId?: string,
  parentTitle?: string,
): DisplayRow[] {
  const rows: DisplayRow[] = []

  nodes.forEach((node, idx) => {
    rows.push({
      node,
      depth,
      parentId,
      parentTitle,
      indexInLevel: idx,
      totalInLevel: nodes.length,
      canIndent: idx > 0, // Can indent if there is a preceding sibling at this level
      canOutdent: depth > 0, // Can outdent if nested
    })

    if (Array.isArray(node.children) && node.children.length > 0 && !node.collapsed) {
      const childRows = flattenTreeForDisplay(
        node.children,
        depth + 1,
        node.id,
        node.label,
      )
      rows.push(...childRows)
    }
  })

  return rows
}

/**
 * Indents a node to become the last child of its preceding sibling
 */
export function indentNodeInTree(tree: MenuTreeNode[], targetId: string): MenuTreeNode[] {
  function traverse(nodes: MenuTreeNode[]): { updated: MenuTreeNode[]; moved: boolean } {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === targetId) {
        if (i === 0) return { updated: nodes, moved: false } // No preceding sibling
        const prevSibling = { ...nodes[i - 1] }
        const current = { ...nodes[i], parentId: prevSibling.id }
        prevSibling.children = [...(prevSibling.children || []), current]

        const nextNodes = [...nodes]
        nextNodes[i - 1] = prevSibling
        nextNodes.splice(i, 1) // Remove current from its current level
        return { updated: nextNodes, moved: true }
      }

      if (nodes[i].children && nodes[i].children!.length > 0) {
        const res = traverse(nodes[i].children!)
        if (res.moved) {
          const nextNodes = [...nodes]
          nextNodes[i] = { ...nodes[i], children: res.updated }
          return { updated: nextNodes, moved: true }
        }
      }
    }
    return { updated: nodes, moved: false }
  }

  return traverse(tree).updated
}

/**
 * Outdents a node up one level to become the following sibling of its parent
 */
export function outdentNodeInTree(tree: MenuTreeNode[], targetId: string): MenuTreeNode[] {
  function traverse(
    nodes: MenuTreeNode[],
    currentParentId?: string,
  ): { updated: MenuTreeNode[]; outdentedNode: MenuTreeNode | null } {
    for (let i = 0; i < nodes.length; i++) {
      const parent = nodes[i]
      if (parent.children && parent.children.length > 0) {
        const childIdx = parent.children.findIndex((c) => c.id === targetId)
        if (childIdx !== -1) {
          const childToOutdent = { ...parent.children[childIdx], parentId: currentParentId || null }
          const updatedChildren = parent.children.filter((_, idx) => idx !== childIdx)
          const updatedParent = { ...parent, children: updatedChildren }

          const nextNodes = [...nodes]
          nextNodes[i] = updatedParent
          nextNodes.splice(i + 1, 0, childToOutdent) // Insert after parent at this level
          return { updated: nextNodes, outdentedNode: childToOutdent }
        }

        // Search deeper
        const deeper = traverse(parent.children, parent.id)
        if (deeper.outdentedNode) {
          const nextNodes = [...nodes]
          nextNodes[i] = { ...parent, children: deeper.updated }
          return { updated: nextNodes, outdentedNode: deeper.outdentedNode }
        }
      }
    }
    return { updated: nodes, outdentedNode: null }
  }

  return traverse(tree).updated
}

/**
 * Moves a node up or down within its sibling level
 */
export function moveNodeInLevel(
  tree: MenuTreeNode[],
  targetId: string,
  direction: 'up' | 'down',
): MenuTreeNode[] {
  function traverse(nodes: MenuTreeNode[]): { updated: MenuTreeNode[]; moved: boolean } {
    const idx = nodes.findIndex((n) => n.id === targetId)
    if (idx !== -1) {
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= nodes.length) {
        return { updated: nodes, moved: false }
      }
      const nextNodes = [...nodes]
      const temp = nextNodes[idx]
      nextNodes[idx] = nextNodes[targetIdx]
      nextNodes[targetIdx] = temp
      return { updated: nextNodes, moved: true }
    }

    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].children && nodes[i].children!.length > 0) {
        const res = traverse(nodes[i].children!)
        if (res.moved) {
          const nextNodes = [...nodes]
          nextNodes[i] = { ...nodes[i], children: res.updated }
          return { updated: nextNodes, moved: true }
        }
      }
    }

    return { updated: nodes, moved: false }
  }

  return traverse(tree).updated
}

/**
 * Recursively updates properties of a node by ID
 */
export function updateNodeInTree(
  tree: MenuTreeNode[],
  targetId: string,
  patch: Partial<MenuTreeNode>,
): MenuTreeNode[] {
  return tree.map((node) => {
    if (node.id === targetId) {
      return { ...node, ...patch }
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeInTree(node.children, targetId, patch),
      }
    }
    return node
  })
}

/**
 * Recursively deletes a node by ID
 */
export function deleteNodeFromTree(tree: MenuTreeNode[], targetId: string): MenuTreeNode[] {
  return tree
    .filter((node) => node.id !== targetId)
    .map((node) => {
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: deleteNodeFromTree(node.children, targetId),
        }
      }
      return node
    })
}

/**
 * Moves a dragged node relative to target node ('before' | 'after' | 'inside')
 */
export function reorderTreeDragDrop(
  tree: MenuTreeNode[],
  sourceId: string,
  targetId: string,
  dropPosition: 'before' | 'after' | 'inside',
): MenuTreeNode[] {
  if (sourceId === targetId) return tree

  // 1. Extract source node
  let extracted: MenuTreeNode | null = null
  function extract(nodes: MenuTreeNode[]): MenuTreeNode[] {
    const filtered: MenuTreeNode[] = []
    for (const n of nodes) {
      if (n.id === sourceId) {
        extracted = n
      } else {
        const copy = { ...n }
        if (copy.children && copy.children.length > 0) {
          copy.children = extract(copy.children)
        }
        filtered.push(copy)
      }
    }
    return filtered
  }

  const treeWithoutSource = extract(tree)
  if (!extracted) return tree

  const nodeToInsert = extracted as MenuTreeNode

  // 2. Insert into new position
  function insert(nodes: MenuTreeNode[], parentId?: string): { updated: MenuTreeNode[]; inserted: boolean } {
    const result: MenuTreeNode[] = []
    let inserted = false

    for (const n of nodes) {
      if (n.id === targetId) {
        if (dropPosition === 'before') {
          result.push({ ...nodeToInsert, parentId: parentId || null })
          result.push(n)
          inserted = true
        } else if (dropPosition === 'after') {
          result.push(n)
          result.push({ ...nodeToInsert, parentId: parentId || null })
          inserted = true
        } else if (dropPosition === 'inside') {
          const updated = {
            ...n,
            children: [...(n.children || []), { ...nodeToInsert, parentId: n.id }],
          }
          result.push(updated)
          inserted = true
        }
      } else {
        const copy = { ...n }
        if (copy.children && copy.children.length > 0) {
          const deeper = insert(copy.children, n.id)
          if (deeper.inserted) {
            copy.children = deeper.updated
            inserted = true
          }
        }
        result.push(copy)
      }
    }

    return { updated: result, inserted }
  }

  const insertResult = insert(treeWithoutSource)
  return insertResult.inserted ? insertResult.updated : tree
}
