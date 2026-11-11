import lucideCatalog from './generated/lucide-catalog.json'
import { CUSTOM_ICON_CATALOG } from './custom-icons'
import type { IconCatalog, IconCatalogEntry } from './types'

const lucide = lucideCatalog as IconCatalog

export function getLucideCatalog(): IconCatalog {
  return lucide
}

export function getBuiltInCatalog(): IconCatalogEntry[] {
  return [
    ...CUSTOM_ICON_CATALOG,
    ...lucide.icons.map((icon) => ({ ...icon, source: 'lucide' as const })),
  ]
}

export function getBuiltInCategories(): string[] {
  const set = new Set<string>(['custom', ...lucide.categories])
  return [...set].sort()
}

export function searchBuiltInIcons(query: string, category?: string | null): IconCatalogEntry[] {
  const q = query.trim().toLowerCase()
  const cat = category?.trim().toLowerCase() || null
  return getBuiltInCatalog().filter((icon) => {
    if (cat === 'custom' && icon.source !== 'custom') return false
    if (cat && cat !== 'custom' && !(icon.categories || []).includes(cat)) return false
    if (!q) return true
    const hay = [icon.name, icon.label, ...(icon.tags || []), ...(icon.categories || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

export function getIconCatalogVersion(): string {
  return lucide.version
}
