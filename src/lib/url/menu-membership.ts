type Relation = string | number | { id?: string | number | null } | null | undefined

type MenuItem = {
  link?: {
    type?: string | null
    page?: Relation
  } | null
}

function relationId(value: Relation): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value.id == null) return undefined
  return String(value.id)
}

export function linkedPageIds(menus: { items?: MenuItem[] | null }[]): Set<string> {
  const ids = new Set<string>()
  for (const menu of menus) {
    for (const item of menu.items || []) {
      if (item.link?.type !== 'page') continue
      const id = relationId(item.link.page)
      if (id) ids.add(id)
    }
  }
  return ids
}
