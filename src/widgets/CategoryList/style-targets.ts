import type { ListPresentationConfig, MarkerStyleConfig } from '@/lib/style-engine/list-presentation'
import type { StyleModalDomain } from '@/lib/style-engine/domains'
import type { UniversalStyle } from '@/lib/style-engine/types'
import type { IconRef } from '@/lib/icons'

export type CategoryListStyleTarget =
  | 'container'
  | 'parentItem'
  | 'childItem'
  | 'marker'
  | 'chevron'

export const CATEGORY_LIST_STYLE_TARGETS: Array<{
  id: CategoryListStyleTarget
  label: string
  domains: StyleModalDomain[]
}> = [
  {
    id: 'container',
    label: 'List Container',
    domains: ['background', 'spacing', 'borders'],
  },
  {
    id: 'parentItem',
    label: 'Parent Item',
    domains: ['typography', 'background', 'spacing', 'borders'],
  },
  {
    id: 'childItem',
    label: 'Child Item',
    domains: ['typography', 'background', 'spacing', 'borders'],
  },
  {
    id: 'marker',
    label: 'Marker',
    domains: ['typography', 'spacing', 'borders'],
  },
  {
    id: 'chevron',
    label: 'Chevron',
    domains: ['typography', 'spacing'],
  },
]

export function getCategoryListTargetMeta(id: CategoryListStyleTarget) {
  return CATEGORY_LIST_STYLE_TARGETS.find((t) => t.id === id) || CATEGORY_LIST_STYLE_TARGETS[0]
}

export function readCategoryListTargetStyle(
  presentation: ListPresentationConfig | undefined,
  target: CategoryListStyleTarget,
): UniversalStyle {
  const p = presentation || {}
  if (target === 'container') return { ...(p.container || {}) }
  if (target === 'parentItem') return { ...(p.item || {}), ...(p.itemParent || {}) }
  if (target === 'childItem') return { ...(p.item || {}), ...(p.itemChild || {}) }
  if (target === 'marker') {
    const m = p.marker || {}
    return {
      colorToken: m.colorToken,
      spacing: m.gapToken ? { gapToken: m.gapToken } : undefined,
      background: m.background,
      border: m.border,
      radius: m.radius,
    }
  }
  const c = p.chevron || {}
  return {
    colorToken: c.colorToken,
    ...(c as UniversalStyle),
  }
}

export function writeCategoryListTargetStyle(
  presentation: ListPresentationConfig | undefined,
  target: CategoryListStyleTarget,
  style: UniversalStyle,
): ListPresentationConfig {
  const base: ListPresentationConfig = { ...(presentation || {}) }
  if (target === 'container') {
    return { ...base, container: style }
  }
  if (target === 'parentItem') {
    return { ...base, itemParent: style }
  }
  if (target === 'childItem') {
    return { ...base, itemChild: style }
  }
  if (target === 'marker') {
    const prev: MarkerStyleConfig = { ...(base.marker || {}), mode: base.marker?.mode || 'none' }
    return {
      ...base,
      marker: {
        ...prev,
        colorToken: style.colorToken || prev.colorToken,
        gapToken: style.spacing?.gapToken || prev.gapToken,
        background: style.background || prev.background,
        border: style.border || prev.border,
        radius: style.radius || prev.radius,
      },
    }
  }
  return {
    ...base,
    chevron: {
      ...(base.chevron || {}),
      ...style,
      colorToken: style.colorToken || base.chevron?.colorToken,
    },
  }
}

export function patchCategoryListMarker(
  presentation: ListPresentationConfig | undefined,
  patch: Partial<MarkerStyleConfig> & { icon?: IconRef | null },
): ListPresentationConfig {
  return {
    ...(presentation || {}),
    marker: {
      mode: presentation?.marker?.mode || 'none',
      ...(presentation?.marker || {}),
      ...patch,
    },
  }
}
