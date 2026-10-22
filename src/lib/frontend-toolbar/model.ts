import type { SeoPageContext } from '@/lib/seo/types'

export type ToolbarLink = { label: string; href: string }
export type ToolbarData = {
  path: string
  displayName: string
  dashboard: string
  profile: string
  logout: string
  edit?: ToolbarLink
  design?: ToolbarLink
  create: ToolbarLink[]
}

export function suppressToolbar(path: string, search = '', framed = false): boolean {
  const params = new URLSearchParams(search)
  return framed || /^\/(admin|api|_next|pattern-preview)(\/|$)/.test(path) ||
    ['preview', 'preview_theme', 'draft'].some((key) => params.has(key))
}

export function resourceTarget(context: SeoPageContext) {
  if (context.status !== 'ok') return undefined
  const resource = context.resourceType
  const collection = resource === 'post' ? 'posts'
    : resource === 'page' || (resource === 'home' && context.page) ? 'pages'
      : resource === 'category' ? 'categories' : resource === 'tag' ? 'tags' : undefined
  const id = context.document?.id
  if (!collection || typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return undefined
  return { collection, id } as const
}

export function designTemplate(context: SeoPageContext): string | undefined {
  if (context.status !== 'ok') return undefined
  if (context.resourceType === 'post') return 'single'
  if (context.resourceType === 'page' || (context.resourceType === 'home' && context.page)) return 'page'
  if (context.resourceType === 'home') return 'home'
  if (context.resourceType === 'category' || context.resourceType === 'tag') return 'category'
  return undefined
}
